import anser from 'anser'
import hljs from 'highlightjs'
import katex, { KatexOptions } from 'katex'
import { MarkedOptions } from 'marked'
import { Document, HTMLElement } from 'nodom'

import {
  createElementCreator,
  createHtmlRenderer,
  createNbRenderer,
  NbRenderer,
  NbRendererOpts as BaseOptions,
} from 'ipynb2html-core'

import buildMarkdownRenderer from './markdownRenderer'


export { default as version } from './version'

export { NbRenderer }

export type NbRendererOpts = BaseOptions<HTMLElement> & {
  /**
   * The prefix to be used for all CSS class names except `lang-*`.
   * Default is `nb-`.
   */
  classPrefix?: string,
  /**
   * Options for the KaTeX math renderer. Default is
   * `{ displayMode: true, throwOnError: false }`. The provided options will
   * be merged with the default.
   */
  katexOpts?: KatexOptions,
  /**
   * Options for the marked Markdown renderer.
   */
  markedOpts?: MarkedOptions,
}

const defaultKatexOpts: KatexOptions = {
  displayMode: true,
  throwOnError: false,
}

function ansiCodesRenderer (input: string): string {
  return anser.ansiToHtml(anser.escapeForHtml(input))
}

function codeHighlighter (code: string, lang: string): string {
  return hljs.getLanguage(lang)
    ? hljs.highlight(lang, code).value
    : code
}

/**
 * Builds a full-fledged Notebook renderer for server-side rendering with a
 * fake DOM implementation "nodom".
 *
 * It supports rendering of Markdown cells with math (using marked and KaTeX),
 * code highlighting (using highlight.js), rendering of ANSI escape sequences
 * (using Anser) and SageMath-style math outputs. All of them may be overridden
 * via *opts*.
 *
 * It returns a "callable object" that exposes one renderer function for each
 * of the Notebook's AST nodes. You can easily replace any of the functions to
 * modify behaviour of the renderer.
 */
export function createRenderer (opts: NbRendererOpts = {}): NbRenderer<HTMLElement> {
  const katexOpts = { ...defaultKatexOpts, ...opts.katexOpts }

  const doc = new Document()
  const elementCreator = createElementCreator(doc.createElement.bind(doc), opts.classPrefix)
  const markdownRenderer = buildMarkdownRenderer(opts.markedOpts, katexOpts)
  const mathRenderer = (tex: string) => katex.renderToString(tex, katexOpts)

  const dataRenderers = {
    'text/html': createHtmlRenderer({ elementCreator, mathRenderer }),
    ...opts.dataRenderers,
  }

  return createNbRenderer(elementCreator, {
    ansiCodesRenderer,
    codeHighlighter,
    dataRenderers,
    markdownRenderer,
    ...opts,
  })
}
