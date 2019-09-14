// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
// Based on https://github.com/jupyter/notebook/blob/6.0.1/notebook/static/notebook/js/mathjaxutils.js.
import { escapeHTML } from './utils'

// Some magic for deferring mathematical expressions to MathJax by hiding them
// from the Markdown parser.
// Some of the code here is adapted with permission from Davide Cervone under
// the terms of the Apache2 license governing the MathJax project.
// Other minor modifications are also due to StackExchange and are used with
// permission.

// The pattern for math delimiters and special symbols needed for searching for
// math in the text input.
const mathSplitRx = /(\$\$?|\\(?:begin|end)\{[a-z]*\*?\}|\\[{}$]|[{}]|(?:\n\s*)+|@@\d+@@|\\\\(?:\(|\)|\[|\]))/i

// Except for extreme edge cases, this should catch precisely those pieces of
// the Markdown source that will later be turned into code spans. While
// MathJax will not TeXify code spans, we still have to consider them at this
// point; the following issue has happened several times:
//
//     `$foo` and `$bar` are variables.  -->  <code>$foo ` and `$bar</code> are variables.
//
function escapeCodes (text: string): string {
  const escapeDolar = (match: string) => match.replace(/\$/g, '~D')

  return text
    .replace(/~/g, '~T')
    .replace(/(^|[^\\])(`+)([^\n]*?[^`\n])\2(?!`)/gm, escapeDolar)
    .replace(/^\s{0,3}(`{3,})(.|\n)*?\1/gm, escapeDolar)
}

function unescapeCodes (text: string): string {
  const subs = { T: '~', D: '$' }

  return text.replace(/~([TD])/g, (_, char: keyof typeof subs) => subs[char])
}

// - The math is in blocks start through end, so collect it into one block and
//   clear the others.
// - Replace &, <, and > by named entities.
// - Clear the current math positions and store the index of the math, then
//   push the math string onto the storage array.
// - The preProcess function is called on all blocks if it has been passed in
function processMath (
  preProcess: (str: string) => string,
  math: string[],
  blocks: string[],
  start: number,
  end: number,
): void {

  const block = escapeHTML(blocks.slice(start, end + 1).join(''))

  while (end > start) {
    blocks[end] = ''
    end--
  }
  // Replace the current block text with a unique tag to find later.
  blocks[start] = `@@${math.length}@@`

  math.push(preProcess(block))
}

// - Break up the text into its component parts and search through them for
//   math delimiters, braces, line breaks, etc.
// - Math delimiters must match and braces must balance.
// - Don't allow math to pass through a double line break (which will be
//   a paragraph).
export function removeMath (text: string): [string, string[]] {
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

    if (block.startsWith('@')) {
      // Things that look like our math markers will get stored and then
      // retrieved along with the math.
      blocks[i] = `@@${math.length}@@`
      math.push(block)

    } else if (startIdx) {
      // If we are in math, look for the end delimiter, but don't go past
      // double line breaks, and and balance braces within the math.
      if (block === endDelim) {
        if (bracesLevel) {
          lastIdx = i
        } else {
          processMath(unescape, math, blocks, startIdx, i)
          startIdx = endDelim = lastIdx = null
        }
      } else if (block.match(/\n.*\n/)) {
        if (lastIdx) {
          i = lastIdx
          processMath(unescape, math, blocks, startIdx, i)
        }
        startIdx = endDelim = lastIdx = null
        bracesLevel = 0
      } else if (block === '{') {
        bracesLevel++
      } else if (block === '}' && bracesLevel) {
        bracesLevel--
      }
    } else {
      // Look for math start delimiters and when found, set up
      // the end delimiter.
      if (block === '$' || block === '$$') {
        startIdx = i
        endDelim = block
        bracesLevel = 0
      } else if (block === '\\\\(' || block === '\\\\[') {
        startIdx = i
        endDelim = block.endsWith('(') ? '\\\\)' : '\\\\]'
        bracesLevel = 0
      } else if (block.startsWith('\\begin')) {
        startIdx = i
        endDelim = '\\end' + block.substr(6)
        bracesLevel = 0
      }
    }
  }
  if (lastIdx) {
    processMath(unescape, math, blocks, startIdx || 0, lastIdx)
    startIdx = endDelim = lastIdx = null
  }
  return [unescape(blocks.join('')), math]
}

// Put back the math strings that were saved, and clear the math array (no need
// to keep it around).
export function replaceMath (text: string, math: string[]): string {
  return text.replace(/@@(\d+)@@/g, (_, n) => math[Number(n)])
}
