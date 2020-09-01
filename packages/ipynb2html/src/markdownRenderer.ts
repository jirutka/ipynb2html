import hljs from 'highlight.js'
import katex, { KatexOptions } from 'katex'
import marked, { Slugger } from 'marked'

import { mathExtractor } from 'ipynb2html-core-fix'


export type MarkdownRenderer = (markdown: string) => string

export interface MarkedOptions extends marked.MarkedOptions {
  /** Generate heading anchors (this implies headingIds). */
  headerAnchors?: boolean
  headerIdsStripAccents?: boolean
}

// Removes accents from the given string.
const stripAccents = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

// Removes math markers from the given string.
const stripMath = (text: string) => mathExtractor.restoreMath(text, []).trim()

class Renderer extends marked.Renderer {

  heading (text: string, level: 1 | 2 | 3 | 4 | 5 | 6, raw: string, slugger: Slugger): string {
    const opts = this.options as MarkedOptions

    if (!opts.headerIds && !opts.headerAnchors) {
      return super.heading(text, level, raw, slugger)
    }

    let id = (opts.headerPrefix ?? '') + slugger.slug(stripMath(raw))
    if (opts.headerIdsStripAccents) {
      id = stripAccents(id)
    }

    if (opts.headerAnchors) {
      text = `<a class="anchor" href="#${id}" aria-hidden="true"></a>${text}`
    }
    return `<h${level} id="${id}">${text}</h${level}>`
  }

  link (href: string | null, title: string | null, text: string): string {
    return super.link(href && stripMath(href), title && stripMath(title), text)
  }

  image (href: string | null, title: string | null, text: string): string {
    return super.image(href && stripMath(href), title && stripMath(title), stripMath(text))
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
export default (markedOpts: MarkedOptions = {}, katexOpts: KatexOptions = {}): MarkdownRenderer => {

  markedOpts = { renderer: new Renderer(markedOpts), ...markedOpts }
  if (hljs) {  // highlight.js may be an optional dependency (in browser bundle)
    markedOpts = { highlight, ...markedOpts }
  }

  return katex  // katex may be an optional dependency (in browser bundle)
    ? rendererWithMath(markedOpts, katexOpts)
    : renderer(markedOpts)
}
