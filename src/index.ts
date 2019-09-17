import AnsiUp from 'ansi_up'
import hjs from 'highlightjs'
import { KatexOptions } from 'katex'
import { MarkedOptions } from 'marked'
import { Document } from 'nodom'

import buildElementCreator from './elementCreator'
import buildMarkdownRenderer from './markdownRenderer'
import buildRenderer, { Options as RendererOpts, NbRenderer } from './renderer'


export { NbRenderer }

export type Options = Partial<RendererOpts> & {
  classPrefix?: string,
  katexOpts?: KatexOptions,
  markedOpts?: MarkedOptions,
}


function codeHighlighter (code: string, lang: string): string {
  return hjs.getLanguage(lang)
    ? hjs.highlight(lang, code).value
    : code
}

export default (opts: Options = {}): NbRenderer => {
  const doc = new Document()
  const elementCreator = buildElementCreator(doc.createElement.bind(doc), opts.classPrefix)

  const ansiUp = new AnsiUp()
  const ansiCodesRenderer = ansiUp.ansi_to_html.bind(ansiUp)

  const markdownRenderer = buildMarkdownRenderer(opts.markedOpts, opts.katexOpts)

  return buildRenderer({
    ansiCodesRenderer,
    codeHighlighter,
    elementCreator,
    markdownRenderer,
    ...opts,
  })
}
