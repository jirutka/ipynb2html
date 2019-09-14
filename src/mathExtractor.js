// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
// Based on https://github.com/jupyter/notebook/blob/6.0.1/notebook/static/notebook/js/mathjaxutils.js.
'use strict'

// Some magic for deferring mathematical expressions to MathJax by hiding them
// from the Markdown parser.
// Some of the code here is adapted with permission from Davide Cervone under
// the terms of the Apache2 license governing the MathJax project.
// Other minor modifications are also due to StackExchange and are used with
// permission.

// MATHSPLIT contains the pattern for math delimiters and special symbols
// needed for searching for math in the text input.
var MATHSPLIT = /(\$\$?|\\(?:begin|end)\{[a-z]*\*?\}|\\[{}$]|[{}]|(?:\n\s*)+|@@\d+@@|\\\\(?:\(|\)|\[|\]))/i

// - The math is in blocks i through j, so collect it into one block and clear
//   the others.
// - Replace &, <, and > by named entities.
// - Clear the current math positions and store the index of the math, then
//   push the math string onto the storage array.
// - The preProcess function is called on all blocks if it has been passed in
var processMath = function (i, j, preProcess, math, blocks) {
  var block = blocks.slice(i, j + 1).join('')
    .replace(/&/g, '&amp;')  // use HTML entity for &
    .replace(/</g, '&lt;')  // use HTML entity for <
    .replace(/>/g, '&gt;')  // use HTML entity for >

  while (j > i) {
    blocks[j] = ''
    j--
  }
  // Replace the current block text with a unique tag to find later.
  blocks[i] = '@@' + math.length + '@@'
  if (preProcess) {
    block = preProcess(block)
  }
  math.push(block)
  return blocks
}

// - Break up the text into its component parts and search through them for
//   math delimiters, braces, line breaks, etc.
// - Math delimiters must match and braces must balance.
// - Don't allow math to pass through a double line break (which will be
//   a paragraph).
var removeMath = function (text) {
  var math = [] // stores math strings for later
  var start
  var end
  var last
  var braces

  // Except for extreme edge cases, this should catch precisely those pieces of
  // the Markdown source that will later be turned into code spans. While
  // MathJax will not TeXify code spans, we still have to consider them at this
  // point; the following issue has happened several times:
  //
  //     `$foo` and `$bar` are variables.  -->  <code>$foo ` and `$bar</code> are variables.
  //
  var hasCodeSpans = /`/.test(text)
  var deTilde
  if (hasCodeSpans) {
    var tilde = function (wholematch) {
      return wholematch.replace(/\$/g, '~D')
    }
    text = text
      .replace(/~/g, '~T')
      .replace(/(^|[^\\])(`+)([^\n]*?[^`\n])\2(?!`)/gm, tilde)
      .replace(/^\s{0,3}(`{3,})(.|\n)*?\1/gm, tilde)
    deTilde = function (text) {
      return text.replace(/~([TD])/g, function (wholematch, character) {
        return { T: '~', D: '$' }[character]
      })
    }
  } else {
    deTilde = function (text) { return text }
  }

  // TODO: Test if it works correctly across browsers. The original code uses
  // utils.regex_split() based on http://blog.stevenlevithan.com/archives/cross-browser-split.
  var blocks = text.replace(/\r\n?/g, '\n').split(MATHSPLIT)

  for (var i = 1, m = blocks.length; i < m; i += 2) {
    var block = blocks[i]

    if (block.charAt(0) === '@') {
      // Things that look like our math markers will get stored and then
      // retrieved along with the math.
      blocks[i] = '@@' + math.length + '@@'
      math.push(block)

    } else if (start) {
      // If we are in math, look for the end delimiter, but don't go past
      // double line breaks, and and balance braces within the math.
      if (block === end) {
        if (braces) {
          last = i
        } else {
          blocks = processMath(start, i, deTilde, math, blocks)
          start = null
          end = null
          last = null
        }
      } else if (block.match(/\n.*\n/)) {
        if (last) {
          i = last
          blocks = processMath(start, i, deTilde, math, blocks)
        }
        start = null
        end = null
        last = null
        braces = 0
      } else if (block === '{') {
        braces++
      } else if (block === '}' && braces) {
        braces--
      }
    } else {
      // Look for math start delimiters and when found, set up
      // the end delimiter.
      if (block === '$' || block === '$$') {
        start = i
        end = block
        braces = 0
      } else if (block === '\\\\(' || block === '\\\\[') {
        start = i
        end = block.slice(-1) === '(' ? '\\\\)' : '\\\\]'
        braces = 0
      } else if (block.substr(1, 5) === 'begin') {
        start = i
        end = '\\end' + block.substr(6)
        braces = 0
      }
    }
  }
  if (last) {
    blocks = processMath(start, last, deTilde, math, blocks)
    start = null
    end = null
    last = null
  }
  return [deTilde(blocks.join('')), math]
}

// Put back the math strings that were saved, and clear the math array (no need
// to keep it around).
var replaceMath = function (text, math) {

  // Replaces a math placeholder with its corresponding group.
  // The math delimiters "\\(", "\\[", "\\)" and "\\]" are replaced removing
  // one backslash in order to be interpreted correctly by MathJax.
  var mathGroupProcess = function (match, n) {
    var mathGroup = math[n]

    if (mathGroup.substr(0, 3) === '\\\\(' && mathGroup.substr(mathGroup.length - 3) === '\\\\)') {
      mathGroup = '\\(' + mathGroup.substring(3, mathGroup.length - 3) + '\\)'
    } else if (mathGroup.substr(0, 3) === '\\\\[' && mathGroup.substr(mathGroup.length - 3) === '\\\\]') {
      mathGroup = '\\[' + mathGroup.substring(3, mathGroup.length - 3) + '\\]'
    }

    return mathGroup
  }

  // Replace all the math group placeholders in the text with the saved strings.
  text = text.replace(/@@(\d+)@@/g, mathGroupProcess)

  return text
}

module.exports = {
  removeMath: removeMath,
  replaceMath: replaceMath,
}
