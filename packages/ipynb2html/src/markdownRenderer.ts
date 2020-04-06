import hljs from 'highlightjs'
import katex, { KatexOptions } from 'katex'
import marked, { Slugger } from 'marked'

import { mathExtractor } from 'ipynb2html-core'


export interface MarkedOptions extends marked.MarkedOptions {
  /** Generate heading anchors (this implies headingIds). */
  headerAnchors?: boolean,
}

class Renderer extends marked.Renderer {

  heading (text: string, level: 1 | 2 | 3 | 4 | 5 | 6, raw: string, slugger: Slugger): string {
    if ((this.options as MarkedOptions).headerAnchors) {
      const id = (this.options.headerPrefix ?? '') + slugger.slug(raw)
      return `<h${level} id="${id}"><a class="anchor" href="#${id}" aria-hidden="true"></a>${text}</h${level}>`
    } else {
      return super.heading(text, level, raw, slugger)
    }
  }
}

function highlight (code: string, lang: string): string {
  return hljs.getLanguage(lang)
    ? hljs.highlight(lang, code, true).value
    : code
}

const renderer = (markedOpts: MarkedOptions) => (markdown: string) => marked.parse(markdown, markedOpts)

const rendererWithMath = (markedOpts: MarkedOptions, katexOpts: KatexOptions) => (markdown: string) => {
  const [text, math] = mathExtractor.extractMath(markdown)
  const html = marked.parse(text, markedOpts)

  const mathHtml = math.map(({ value, displayMode }) => {
    return katex.renderToString(value, { ...katexOpts, displayMode })
  })
  return mathExtractor.restoreMath(html, mathHtml)
}

/**
 * Returns a pre-configured marked parser with (optional) math support (using
 * KaTeX) and code highlighter (highlight.js).
 *
 * @param {MarkedOptions} markedOpts Options for the marked Markdown renderer.
 * @param {KatexOptions} katexOpts Options for the KaTeX math renderer.
 */
export default (markedOpts: MarkedOptions = {}, katexOpts: KatexOptions = {}) => {

  markedOpts = { renderer: new Renderer(markedOpts), ...markedOpts }
  if (hljs) {  // highlightjs may be an optional dependency (in browser bundle)
    markedOpts = { highlight, ...markedOpts }
  }

  return katex  // katex may be an optional dependency (in browser bundle)
    ? rendererWithMath(markedOpts, katexOpts)
    : renderer(markedOpts)
}
