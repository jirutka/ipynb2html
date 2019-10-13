import hjs from 'highlightjs'
import * as katex from 'katex'
import { KatexOptions } from 'katex'
import * as marked from 'marked'
import { MarkedOptions } from 'marked'

import { extractMath, restoreMath } from './mathExtractor'


function highlight (code: string, lang: string): string {
  return hjs.getLanguage(lang)
    ? hjs.highlight(lang, code, true).value
    : code
}

/**
 * Returns a pre-configured marked parser with math support (using KaTeX)
 * and code highlighter (highlight.js).
 *
 * @param {MarkedOptions} markedOpts Options for the marked Markdown renderer.
 * @param {KatexOptions} katexOpts Options for the KaTeX math renderer.
 */
export default (markedOpts: MarkedOptions = {}, katexOpts: KatexOptions = {}) => {
  markedOpts = { highlight, ...markedOpts }

  /**
   * Converts the given *markdown* into HTML.
   */
  return (markdown: string): string => {
    const [text, math] = extractMath(markdown)
    const html = marked.parse(text, markedOpts)

    const mathHtml = math.map(({ value, displayMode }) => {
      return katex.renderToString(value, { ...katexOpts, displayMode })
    })
    return restoreMath(html, mathHtml)
  }
}
