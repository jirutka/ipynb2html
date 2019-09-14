// This code is originally based on notebookjs 0.4.2 distributed under the MIT license.
import { ElementCreator, HTMLElement } from './elementCreator'
import { callableObject, escapeHTML, identity } from './utils'
import {
  Cell,
  CellType,
  CodeCell,
  DisplayData,
  Error as NbError,
  ExecuteResult,
  MarkdownCell,
  Notebook,
  Output,
  OutputType,
  RawCell,
  Stream as NbStream,
} from './nbformat'


export type Options = {
  /** An object with additional data renderers indexed by a media type. */
  dataRenderers?: DataRenderers,
  /**
   * An array of the supported media types in the priority order. When a cell
   * contains multiple representations of the data, the one with the media type
   * that has the lowest index in this array will be rendered. The default is
   * `Object.keys({ ...dataRenderers, ...builtinRenderers })`.
   */
  dataRenderersOrder?: string[],

  /** A function for creating HTMLElement. */
  elementCreator: ElementCreator,

  /** A function for converting ANSI escape sequences in the given text to HTML. */
  ansiCodesRenderer?: (text: string) => string,

  /** A function for highlighting the given source code, it should return an HTML string. */
  codeHighlighter?: (code: string, lang: string) => string,

  /** A function for converting the given Markdown source to HTML. */
  markdownRenderer?: (markup: string) => string,
}

export type DataRenderer = (data: string) => HTMLElement

type DataRenderers = { [mediaType: string]: DataRenderer }


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

function executionCountAttrs ({ execution_count: count }: CodeCell): { [k: string]: string } | undefined {
  return count ? {
    'data-execution-count': String(count),
    // Only for backward compatibility with notebook.js.
    'data-prompt-number': String(count),
  } : undefined
}

function notebookLanguage ({ metadata: meta }: Notebook): string {
  return (meta.language_info && meta.language_info.name)
    || (meta.kernelspec && meta.kernelspec.language)
    || 'python'
}

/**
 * Builds a Notebook renderer function with the given options. It returns
 * a "callable object" of renderer functions for each Notebook's AST node.
 * You can easily replace any of the renderer functions to modify behaviour
 * of the renderer.
 */
function buildRenderer (opts: Options) {
  const renderMarkdown = opts.markdownRenderer || identity
  const renderAnsiCodes = opts.ansiCodesRenderer || identity
  const highlightCode = opts.codeHighlighter || identity

  const el = opts.elementCreator
  const el2 = (tag: string, classes: string[]) => (data: string) => el(tag, classes, data)

  const embeddedImageEl = (format: string) => (data: string | string[]) => el('img', {
    class: 'image-output',
    src: `data:image/${format};base64,${joinText(data).replace(/\n/g, '')}`,
  })

  // opts.dataRenderers is intentionally included twice; to get the user's
  // provided renderers in the default dataRenderersOrder before the built-in
  // renderers and at the same time allow to override any built-in renderer.
  const dataRenderers: DataRenderers = {
    ...opts.dataRenderers,
    'image/png': embeddedImageEl('png'),
    'image/jpeg': embeddedImageEl('jpeg'),
    'image/svg+xml': el2('div', ['svg-output']),
    'text/svg+xml': (data) => dataRenderers['image/svg+xml'](data),
    'text/html': el2('div', ['html-output']),
    'text/markdown': (data) => dataRenderers['text/html'](renderMarkdown(data)),
    'text/latex': el2('div', ['latex-output']),
    'application/javascript': el2('script', []),
    'text/plain': (data) => el('pre', ['text-output'], escapeHTML(data)),
    ...opts.dataRenderers,
  }
  const dataRenderersOrder = opts.dataRenderersOrder || Object.keys(dataRenderers)

  const resolveDataType = (output: DisplayData | ExecuteResult) => {
    return dataRenderersOrder.find(type => output.data[type] && dataRenderers[type])
  }

  const r = callableObject('Notebook', {
    Notebook: (notebook: Notebook): HTMLElement => {
      const children = notebook.cells.map(cell => r.Cell(cell, notebook))
      // Class "worksheet" is for backward compatibility with notebook.js.
      return el('div', ['notebook', 'worksheet'], children)
    },

    Cell: (cell: Cell, notebook: Notebook): HTMLElement => {
      switch (cell.cell_type) {
        case CellType.Code: return r.CodeCell(cell, notebook)
        case CellType.Markdown: return r.MarkdownCell(cell, notebook)
        case CellType.Raw: return r.RawCell(cell, notebook)
      }
    },

    MarkdownCell: (cell: MarkdownCell, _notebook: Notebook): HTMLElement => {
      return el('div', ['cell', 'markdown-cell'], renderMarkdown(joinText(cell.source)))
    },

    RawCell: (cell: RawCell, _notebook: Notebook): HTMLElement => {
      return el('div', ['cell', 'raw-cell'], joinText(cell.source))
    },

    CodeCell: (cell: CodeCell, notebook: Notebook): HTMLElement => {
      const children = coalesceStreams(cell.outputs || [])
        .map(output => r.Output(output, cell))

      children.unshift(r.Source(cell, notebook))

      return el('div', ['cell', 'code-cell'], children)
    },

    Source: (cell: CodeCell, notebook: Notebook): HTMLElement => {
      if (!cell.source.length) {
        return el('div')
      }
      const lang = notebookLanguage(notebook)
      const html = highlightCode(escapeHTML(joinText(cell.source)), lang)

      const codeEl = el('code', { 'classes': `lang-${lang}`, 'data-language': lang }, html)
      const preEl = el('pre', [], [codeEl])

      // Class "input" is for backward compatibility with notebook.js.
      const attrs = { ...executionCountAttrs(cell), class: 'source input' }

      return el('div', attrs, [preEl])
    },

    Output: (output: Output, cell: CodeCell): HTMLElement => {
      const innerEl = (() => {
        switch (output.output_type) {
          case OutputType.DisplayData: return r.DisplayData(output)
          case OutputType.ExecuteResult: return r.ExecuteResult(output)
          case OutputType.Stream: return r.Stream(output)
          case OutputType.Error: return r.Error(output)
        }
      })()
      const attrs = { ...executionCountAttrs(cell), class: 'output' }

      return el('div', attrs, [innerEl])
    },

    DisplayData: (output: DisplayData): HTMLElement => {
      const type = resolveDataType(output)
      if (type) {
        return dataRenderers[type](joinText(output.data[type]))
      }
      return el('div', ['empty-output'])
    },

    ExecuteResult: (output: ExecuteResult): HTMLElement => {
      const type = resolveDataType(output)
      if (type) {
        return dataRenderers[type](joinText(output.data[type]))
      }
      return el('div', ['empty-output'])
    },

    Error: (error: NbError): HTMLElement => {
      const raw = error.traceback.join('\n')
      const html = renderAnsiCodes(escapeHTML(raw))

      // Class "pyerr" is for backward compatibility with notebook.js.
      return el('pre', ['error', 'pyerr'], html)
    },

    Stream: (stream: NbStream): HTMLElement => {
      const raw = joinText(stream.text)
      const html = renderAnsiCodes(escapeHTML(raw))

      return el('pre', [stream.name], html)
    },
  })
  return r
}

export type NbRenderer = ReturnType<typeof buildRenderer>

export default buildRenderer
