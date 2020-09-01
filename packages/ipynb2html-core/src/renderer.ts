// This code is originally based on notebookjs 0.4.2 distributed under the MIT license.
import { ElementCreator } from './elementCreator'
import { CallableInstance, escapeHTML, identity } from './internal/utils'
import {
  Cell,
  CellType,
  CodeCell,
  DisplayData,
  ErrorOutput,
  ExecuteResult,
  MarkdownCell,
  Notebook,
  Output,
  OutputType,
  RawCell,
  StreamOutput,
} from './nbformat'


export type NbRendererOpts<TElement = HTMLElement> = {
  /**
   * An object with additional data renderers indexed by a media type.
   */
  dataRenderers?: DataRenderers<TElement>,
  /**
   * An array of the supported MIME types in the priority order. When a cell
   * contains multiple representations of the data, the one with the media type
   * that has the lowest index in this array will be rendered. The default is
   * `Object.keys({ ...dataRenderers, ...builtinRenderers })`.
   */
  dataTypesPriority?: string[],
  /**
   * A function for converting ANSI escape sequences in the given *text* to HTML.
   * It gets the text from the cell as-is, without prior escaping, so it must
   * escape special characters unsafe for HTML (ansi_up does it implicitly)!
   */
  ansiCodesRenderer?: (text: string) => string,
  /**
   * A function for highlighting the given source *code*, it should return an
   * HTML string. It gets the text from the cell as-is, without prior escaping,
   * so it must escape special characters unsafe for HTML (highlight.js does it
   * implicitly)!
   */
  codeHighlighter?: (code: string, lang: string) => string,
  /**
   * A function for converting the given Markdown source to HTML.
   */
  markdownRenderer?: (markup: string) => string,
}

export type DataRenderer<TElement = HTMLElement> = (this: NbRenderer<TElement> | void, data: string) => TElement

type DataRenderers<TElement> = { [mediaType: string]: DataRenderer<TElement> }


function joinText (text: string | string[]): string {
  return Array.isArray(text) ? text.map(joinText).join('') : text
}

function coalesceStreams (outputs: Output[]): Output[] {
  if (!outputs.length) { return outputs }

  let last = outputs[0]
  const newOutputs = [last]

  for (const output of outputs.slice(1)) {
    if (output.output_type === 'stream' && last.output_type === 'stream' && output.name === last.name) {
      last.text = last.text.concat(...output.text)
    } else {
      newOutputs.push(output)
      last = output
    }
  }
  return newOutputs
}

function executionCountAttrs ({ execution_count: count }: CodeCell): { [k: string]: string } {
  return count ? {
    'data-execution-count': String(count),
    // Only for backward compatibility with notebook.js.
    'data-prompt-number': String(count),
  } : {}
}

function notebookLanguage ({ metadata: meta }: Notebook): string {
  return meta.language_info?.name ?? 'python'
}

class NbRenderer <TElement> extends CallableInstance<NbRenderer<TElement>> {

  readonly el: ElementCreator<TElement>
  readonly renderMarkdown: NonNullable<NbRendererOpts['markdownRenderer']>
  readonly renderAnsiCodes: NonNullable<NbRendererOpts['ansiCodesRenderer']>
  readonly highlightCode: NonNullable<NbRendererOpts['codeHighlighter']>
  readonly dataRenderers: DataRenderers<TElement>
  readonly dataTypesPriority: string[]

  /**
   * Creates a Notebook renderer with the given options. The constructed object
   * is "callable", i.e. you can treat it as a function.
   *
   * @example
   *   const renderer = new NbRenderer(document.createElement.bind(document))
   *   console.log(renderer(notebook).outerHTML)
   *
   * @param {ElementCreator} elementCreator The function that will be used for
   *   building all HTML elements.
   * @param {NbRendererOpts} opts The renderer's options.
   */
  constructor (elementCreator: ElementCreator<TElement>, opts: NbRendererOpts<TElement> = {}) {
    super()

    this.el = elementCreator
    this.renderMarkdown = opts.markdownRenderer ?? identity
    this.renderAnsiCodes = opts.ansiCodesRenderer ?? escapeHTML
    this.highlightCode = opts.codeHighlighter ?? escapeHTML

    const el2 = (tag: string, classes: string[]) => (data: string) => this.el(tag, classes, data)

    const embeddedImageEl = (format: string) => (data: string) => this.el('img', {
      class: 'image-output',
      src: /^https?/.test(data)?data:`data:image/${format};base64,${data.replace(/\n/g, '')}`,
    })

    // opts.dataRenderers is intentionally included twice; to get the user's
    // provided renderers in the default dataTypesPriority before the built-in
    // renderers and at the same time allow to override any built-in renderer.
    this.dataRenderers = {
      ...opts.dataRenderers,
      'image/png': embeddedImageEl('png'),
      'image/jpeg': embeddedImageEl('jpeg'),
      'image/svg+xml': el2('div', ['svg-output']),
      'text/svg+xml': (data) => this.dataRenderers['image/svg+xml'].call(this, data),
      'text/html': el2('div', ['html-output']),
      'text/markdown': (data) => this.el('div', ['html-output'], this.renderMarkdown(data)),
      'text/latex': el2('div', ['latex-output']),
      'application/javascript': el2('script', []),
      'text/plain': (data) => this.el('pre', ['text-output'], escapeHTML(data)),
      ...opts.dataRenderers,
    }
    this.dataTypesPriority = opts.dataTypesPriority ?? Object.keys(this.dataRenderers)
  }

  /**
   * Renders the given Jupyter *notebook*.
   */
  __call__ (notebook: Notebook): TElement {
    return this.render(notebook)
  }

  /**
   * Renders the given Jupyter *notebook*.
   */
  render (notebook: Notebook): TElement {
    const children = notebook.cells.map(cell => this.renderCell(cell, notebook))
    return this.el('div', ['notebook'], children)
  }

  renderCell (cell: Cell, notebook: Notebook): TElement {
    switch (cell.cell_type) {
      case CellType.Code: return this.renderCodeCell(cell, notebook)
      case CellType.Markdown: return this.renderMarkdownCell(cell, notebook)
      case CellType.Raw: return this.renderRawCell(cell, notebook)
      default: return this.el('div', [], '<!-- Unsupported cell type -->')
    }
  }

  renderMarkdownCell (cell: MarkdownCell, _notebook: Notebook): TElement {
    return this.el('section', ['cell', 'markdown-cell'], this.renderMarkdown(joinText(cell.source)))
  }

  renderRawCell (cell: RawCell, _notebook: Notebook): TElement {
    return this.el('section', ['cell', 'raw-cell'], joinText(cell.source))
  }

  renderCodeCell (cell: CodeCell, notebook: Notebook): TElement {
    const source = cell.source.length > 0
      ? this.renderSource(cell, notebook)
      : this.el('div')

    const outputs = coalesceStreams(cell.outputs ?? [])
      .map(output => this.renderOutput(output, cell))

    return this.el('section', ['cell', 'code-cell'], [source, ...outputs])
  }

  renderSource (cell: CodeCell, notebook: Notebook): TElement {
    const lang = notebookLanguage(notebook)
    const html = this.highlightCode(joinText(cell.source), lang)

    const codeEl = this.el('code', { 'class': `lang-${lang}`, 'data-language': lang }, html)
    const preEl = this.el('pre', [], [codeEl])

    // Class "input" is for backward compatibility with notebook.js.
    const attrs = { ...executionCountAttrs(cell), class: 'source input' }

    return this.el('div', attrs, [preEl])
  }

  renderOutput (output: Output, cell: CodeCell): TElement {
    const innerEl = (() => {
      switch (output.output_type) {
        case OutputType.DisplayData: return this.renderDisplayData(output)
        case OutputType.ExecuteResult: return this.renderExecuteResult(output)
        case OutputType.Stream: return this.renderStream(output)
        case OutputType.Error: return this.renderError(output)
        default: return this.el('div', [], '<!-- Unsupported output type -->')
      }
    })()
    const attrs = { ...executionCountAttrs(cell), class: 'output' }

    return this.el('div', attrs, [innerEl])
  }

  renderDisplayData (output: DisplayData): TElement {
    const type = this.resolveDataType(output)
    if (type) {
      return this.renderData(type, joinText(output.data[type]))
    }
    return this.el('div', ['empty-output'])
  }

  renderExecuteResult (output: ExecuteResult): TElement {
    const type = this.resolveDataType(output)
    if (type) {
      return this.renderData(type, joinText(output.data[type]))
    }
    return this.el('div', ['empty-output'])
  }

  renderError (error: ErrorOutput): TElement {
    const html = this.renderAnsiCodes(error.traceback.join('\n'))
    // Class "pyerr" is for backward compatibility with notebook.js.
    return this.el('pre', ['error', 'pyerr'], html)
  }

  renderStream (stream: StreamOutput): TElement {
    const html = this.renderAnsiCodes(joinText(stream.text))
    return this.el('pre', [stream.name], html)
  }

  renderData (mimeType: string, data: string): TElement {
    const render = this.dataRenderers[mimeType]
    if (!render) {
      throw RangeError(`missing renderer for MIME type: ${mimeType}`)
    }
    return render.call(this, data)
  }

  resolveDataType (output: DisplayData | ExecuteResult): string | undefined {
    return this.dataTypesPriority.find(type => output.data[type])
  }
}

export default NbRenderer
