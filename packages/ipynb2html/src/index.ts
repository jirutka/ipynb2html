import anser from 'anser'
import hljs from 'highlightjs'
import katex, { KatexOptions } from 'katex'
import marked from 'marked'

import {
  createElementCreator,
  createHtmlRenderer,
  MinimalElement,
  NbRenderer,
  NbRendererOpts as BaseOptions,
  Notebook,
} from 'ipynb2html-core'

import buildMarkdownRenderer, { MarkedOptions } from './markdownRenderer'


export { default as version } from './version'
export { default as readNotebookTitle } from './readNotebookTitle'
export { NbRenderer, Notebook }

export type NbRendererOpts<TElement = HTMLElement> = BaseOptions<TElement> & {
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

/**
 * Definition of the smallest possible subset of the Document type required
 * for this module's function.
 */
type MinimalDocument<TElement extends MinimalElement> = {
  createElement (tag: string): TElement,
}

const defaultKatexOpts: KatexOptions = {
  displayMode: true,
  throwOnError: false,
}

const defaultMarkedOpts: MarkedOptions = {
  headerAnchors: true,
}

function hljsCodeHighlighter (code: string, lang: string): string {
  return hljs.getLanguage(lang)
    ? hljs.highlight(lang, code).value
    : code
}

/**
 * Builds a full-fledged Jupyter Notebook renderer.
 *
 * It supports rendering of Markdown cells with math (using marked and KaTeX),
 * code highlighting (using highlight.js), rendering of ANSI escape sequences
 * (using Anser) and SageMath-style math outputs. All of them may be overridden
 * via *opts*.
 *
 * It returns a "callable object" that exposes one renderer function for each
 * of the Notebook's AST nodes. You can easily replace any of the functions to
 * modify behaviour of the renderer.
 *
 * @example  // Node.js
 *   import * as fs from 'fs'
 *   import * as ipynb from 'ipynb2html'
 *   import { Document } from 'nodom'
 *
 *   const renderNotebook = ipynb.createRenderer(new Document())
 *   const notebook = JSON.parse(fs.readFileSync('./example.ipynb', 'utf8'))
 *
 *   console.log(renderNotebook(notebook).outerHTML)
 *
 * @example  // Browser
 *   const render = ipynb2html.createRenderer(document)
 *   document.body.appendChild(render(notebook))
 *
 * @param document The `Document` object from the browser's native DOM or any
 *   fake/virtual DOM library (e.g. nodom). The only required method is
 *   `createElement`.
 * @param opts The renderer options.
 * @return A configured instance of the Notebook renderer.
 */
export function createRenderer <TElement extends MinimalElement> (
  document: MinimalDocument<TElement>,
  opts: NbRendererOpts<TElement> = {},
): NbRenderer<TElement> {

  let { ansiCodesRenderer, codeHighlighter, dataRenderers = {}, markdownRenderer } = opts
  const katexOpts = { ...defaultKatexOpts, ...opts.katexOpts }

  const elementCreator = createElementCreator(
    document.createElement.bind(document),
    opts.classPrefix,
  )

  // The following ifs for the imported modules are for the browser bundle
  // without dependencies.
  if (!ansiCodesRenderer) {
    if (anser) {
      ansiCodesRenderer = (input) => anser.ansiToHtml(anser.escapeForHtml(input))
    } else if (AnsiUp) {
      const ansiUp = new AnsiUp()
      ansiCodesRenderer = ansiUp.ansi_to_html.bind(ansiUp)
    }
  }
  if (!codeHighlighter && hljs) {
    codeHighlighter = hljsCodeHighlighter
  }
  if (!markdownRenderer && marked) {
    const markedOpts = { ...defaultMarkedOpts, ...opts.markedOpts }
    markdownRenderer = buildMarkdownRenderer(markedOpts, katexOpts)
  }
  if (!dataRenderers['text/html'] && katex) {
    const mathRenderer = (tex: string) => katex.renderToString(tex, katexOpts)
    dataRenderers['text/html'] = createHtmlRenderer({ elementCreator, mathRenderer })
  }

  return new NbRenderer(elementCreator, {
    ansiCodesRenderer,
    codeHighlighter,
    dataRenderers,
    markdownRenderer,
    ...opts,
  })
}
