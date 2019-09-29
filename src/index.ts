import anser from 'anser'
import hjs from 'highlightjs'
import katex, { KatexOptions } from 'katex'
import { MarkedOptions } from 'marked'
import { Document, HTMLElement } from 'nodom'

import buildElementCreator from './elementCreator'
import htmlRenderer from './htmlRenderer'
import buildMarkdownRenderer from './markdownRenderer'
import buildRenderer, { Options as RendererOpts, NbRenderer } from './renderer'


export { NbRenderer }

export type Options = RendererOpts<HTMLElement> & {
  classPrefix?: string,
  katexOpts?: KatexOptions,
  markedOpts?: MarkedOptions,
}


function ansiCodesRenderer (input: string): string {
  return anser.ansiToHtml(anser.escapeForHtml(input))
}

function codeHighlighter (code: string, lang: string): string {
  return hjs.getLanguage(lang)
    ? hjs.highlight(lang, code).value
    : code
}

function mathRenderer (tex: string) {
  return katex.renderToString(tex, { displayMode: true, throwOnError: false })
}

export default (opts: Options = {}): NbRenderer<HTMLElement> => {
  const doc = new Document()
  const elementCreator = buildElementCreator(doc.createElement.bind(doc), opts.classPrefix)
  const markdownRenderer = buildMarkdownRenderer(opts.markedOpts, opts.katexOpts)

  const dataRenderers = {
    'text/html': htmlRenderer({ elementCreator, mathRenderer }),
    ...opts.dataRenderers,
  }

  return buildRenderer(elementCreator, {
    ansiCodesRenderer,
    codeHighlighter,
    dataRenderers,
    markdownRenderer,
    ...opts,
  })
}
