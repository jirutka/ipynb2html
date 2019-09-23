// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
// Based on https://github.com/jupyter/notebook/blob/6.0.1/notebook/static/notebook/js/mathjaxutils.js.

// Some magic for deferring mathematical expressions to MathJax by hiding them
// from the Markdown parser.
// Some of the code here is adapted with permission from Davide Cervone under
// the terms of the Apache2 license governing the MathJax project.
// Other minor modifications are also due to StackExchange and are used with
// permission.

export type MathExpression = {
  raw: string,
  value: string,
  displayMode: boolean,
}

// The pattern for math delimiters and special symbols needed for searching for
// math in the text input.
const mathSplitRx = /(\$\$?|\\(?:begin|end)\{[a-z]*\*?\}|\\[{}$]|[{}]|(?:\n\s*)+|\\\\(?:\(|\)|\[|\]))/i

const delimiters = {
  '$$': { displayMode: true },
  '$': { displayMode: false },
  '\\\\[': { displayMode: true },
  '\\\\(': { displayMode: false },
}

/**
 * Parses the given string that may contain a delimited math expression.
 * Use this function to parse extracted chunks from `extractMath()`.
 */
function parseDelimitedMath (raw: string): MathExpression {
  const delim = Object.keys(delimiters)
    .find(s => raw.startsWith(s)) as keyof typeof delimiters | undefined

  if (delim) {
    const value = raw.slice(delim.length, -delim.length).trim()
    return { raw, value, ...delimiters[delim] }

  } else {
    return { raw, value: raw, displayMode: true }
  }
}

/**
 * Escapes dollar characters (`$`) inside in-line codes and fenced code blocks
 * found in the given Markdown text.
 *
 * Except for extreme edge cases, this should catch precisely those pieces of
 * the Markdown source that will later be turned into code spans. While
 * MathJax will not TeXify code spans, we still have to consider them at this
 * point; the following issue has happened several times:
 *
 *     `$foo` and `$bar` are variables.  -->  <code>$foo ` and `$bar</code> are variables.
 */
function escapeCodes (text: string): string {
  const escapeDolar = (match: string) => match.replace(/\$/g, '~D')

  return text
    .replace(/~/g, '~T')
    .replace(/(^|[^\\])(`+)([^\n]*?[^`\n])\2(?!`)/gm, escapeDolar)
    .replace(/^\s{0,3}(`{3,})(.|\n)*?\1/gm, escapeDolar)
}

/**
 * Reverts escaping performed by `escapeCodes()`.
 */
function unescapeCodes (text: string): string {
  const subs = { T: '~', D: '$' }

  return text.replace(/~([TD])/g, (_, char: keyof typeof subs) => subs[char])
}

// - The math is in blocks start through end, so collect it into one block and
//   clear the others.
// - Clear the current math positions and store the index of the math, then
//   push the math string onto the storage array.
// - The preProcess function is called on all blocks if it has been passed in
function processMath (
  preProcess: (str: string) => string,
  math: string[],  // will be modified in-place
  blocks: string[],  // will be modified in-place
  start: number,
  end: number,
): void {

  const block = blocks.slice(start, end + 1).join('')

  while (end > start) {
    blocks[end] = ''
    end--
  }
  // Replace the current block text with a unique tag to find later.
  blocks[start] = `@@${math.length + 1}@@`

  math.push(preProcess(block))
}

/**
 * Extracts delimited math expressions from the given *text*, substitutes them
 * with numbered markers and returns a tuple of the modified *text* and an
 * array of the extracted expressions.
 *
 * NOTE: Sequences that looks like our markers (`@@\d+@@`) will be escaped by
 * adding a zero (`0`) before the number. They will be unescaped in
 * `restoreMath()`.
 */
export function extractMath (text: string): [string, MathExpression[]] {
  // - Break up the text into its component parts and search through them for
  //   math delimiters, braces, line breaks, etc.
  // - Math delimiters must match and braces must balance.
  // - Don't allow math to pass through a double line break (which will be
  //   a paragraph).

  // Escape things that look like our math markers so we can distinguish them
  // later in `restoreMath()`.
  text = text.replace(/@@(\d+)@@/g, (_, n) => `@@0${n}@@`)

  const hasCodeSpans = text.includes('`')
  if (hasCodeSpans) {
    text = escapeCodes(text)
  }
  const unescape = hasCodeSpans ? unescapeCodes : (x: string) => x

  const math: string[] = []  // stores math strings for later

  // TODO: Test if it works correctly across browsers. The original code uses
  // utils.regex_split() based on http://blog.stevenlevithan.com/archives/cross-browser-split.
  const blocks = text.replace(/\r\n?/g, '\n').split(mathSplitRx)

  let startIdx: number | null = null  // the blocks' index where the current math starts
  let lastIdx: number | null = null  // the blocks' index where the current math ends
  let endDelim: string | null = null  // end delimiter of the current math expression
  let bracesLevel = 0  // nesting level of the braces

  for (let i = 1; i < blocks.length; i += 2) {
    const block = blocks[i]

    if (startIdx) {
      // If we are in math, look for the end delimiter, but don't go past
      // double line breaks, and and balance braces within the math.
      switch (block) {
        case endDelim:
          if (bracesLevel) {
            lastIdx = i
          } else {
            processMath(unescape, math, blocks, startIdx, i)
            startIdx = endDelim = lastIdx = null
          }
          break
        case '{':
          bracesLevel++
          break
        case '}':
          if (bracesLevel) { bracesLevel-- }
          break
        default: if (block.match(/\n.*\n/)) {
          if (lastIdx) {
            i = lastIdx
            processMath(unescape, math, blocks, startIdx, i)
          }
          startIdx = endDelim = lastIdx = null
          bracesLevel = 0
        }
      }
    } else {
      // Look for math start delimiters and when found, set up
      // the end delimiter.
      switch (block) {
        case '$':
        case '$$':
          startIdx = i
          endDelim = block
          bracesLevel = 0
          break
        case '\\\\(':
        case '\\\\[':
          startIdx = i
          endDelim = block.endsWith('(') ? '\\\\)' : '\\\\]'
          bracesLevel = 0
          break
        default: if (block.startsWith('\\begin')) {
          startIdx = i
          endDelim = '\\end' + block.substr(6)
          bracesLevel = 0
        }
      }
    }
  }
  if (lastIdx) {
    processMath(unescape, math, blocks, startIdx || 0, lastIdx)
    startIdx = endDelim = lastIdx = null
  }
  return [unescape(blocks.join('')), math.map(parseDelimitedMath)]
}

/**
 * Replaces math markers injected by `extractMath()` into the given *text*
 * with strings from the given *math* array and unescapes sequences that looks
 * like our markers.
 */
export function restoreMath (text: string, math: string[]): string {
  return text
    .replace(/@@([1-9][0-9]*)@@/g, (_, n) => math[Number(n) - 1])
    .replace(/@@0(\d+)@@/g, (_, n) => `@@${n}@@`)
}
