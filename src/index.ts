// This code is originally based on notebookjs 0.4.2 distributed under the MIT license.
import AnsiUp from 'ansi_up'
import jsdom from 'jsdom'
import marked from 'marked'

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


// TODO: This is only transient type, remove later.
type Nb = {
  VERSION: string,
  prefix: string,
  markdown: (markup: string) => string,
  ansi: (text: string) => string,
  highlighter: (code: string, preEl: HTMLElement, codeEl?: HTMLElement, lang?: string) => string,
  renderMath: (element: HTMLElement, config: { [k: string]: any }) => void,
  display: DataRenderers,
  displayPriority: string[],
  render: (notebook: Notebook) => HTMLElement,
}

type DataRenderer = (data: string) => HTMLElement
type DataRenderers = { [mediaType: string]: DataRenderer }

const VERSION = '0.4.2'

const doc = new jsdom.JSDOM().window.document

const ident = <T>(x: T): T => x

// Set up `nb` namespace
const nb: Nb = {
  prefix: 'nb-',
  markdown: marked,
  ansi: new AnsiUp().ansi_to_html,
  highlighter: ident,
  renderMath: (doc as any).renderMathInElement || ident,
  VERSION,
} as any

function makeElement (tag: string, classNames?: string[], innerHTML?: string): HTMLElement {
  const el = doc.createElement(tag)
  el.className = (classNames || []).map(cn => nb.prefix + cn).join(' ')
  if (innerHTML) {
    el.innerHTML = innerHTML
  }
  return el
}

const escapeHTML = (raw: string) => raw.replace(/</g, '&lt;').replace(/>/g, '&gt;')

function joinText (text: string | string[]): string {
  return Array.isArray(text) ? text.map(joinText).join('') : text
}

// Outputs and output-renderers
const imageCreator = (format: string) => (data: string | string[]): HTMLElement => {
  const el = makeElement('img', ['image-output'])
  el.setAttribute('src', `data:image/${format};base64,${joinText(data).replace(/\n/g, '')}`)
  return el
}

nb.display = {
  'text/plain': (data) => makeElement('pre', ['text-output'], escapeHTML(data)),
  'text/html': (data) => makeElement('div', ['html-output'], data),
  'text/markdown': (data) => nb.display['text/html'](nb.markdown(data)),
  'image/svg+xml': (data) => makeElement('div', ['svg-output'], data),
  'text/latex': (data) => makeElement('div', ['latex-output'], data),
  'application/javascript': (data) => makeElement('script', [], data),
  'image/png': imageCreator('png'),
  'image/jpeg': imageCreator('jpeg'),
} as DataRenderers
nb.display['text/svg+xml'] = nb.display['image/svg+xml']

nb.displayPriority = [
  'image/png',
  'image/jpeg',
  'image/svg+xml',
  'text/svg+xml',
  'text/html',
  'text/markdown',
  'text/latex',
  'application/javascript',
  'text/plain',
]


function renderNotebook (notebook: Notebook): HTMLElement {
  // Class "worksheet" is for backward compatibility with notebook.js.
  const el = makeElement('div', ['notebook', 'worksheet'])

  for (const cell of notebook.cells) {
    el.appendChild(renderCell(cell, notebook))
  }
  return el
}
nb.render = renderNotebook

function renderCell (cell: Cell, notebook: Notebook): HTMLElement {
  switch (cell.cell_type) {
    case CellType.Code: return renderCodeCell(cell, notebook)
    case CellType.Markdown: return renderMarkdownCell(cell)
    case CellType.Raw: return renderRawCell(cell)
  }
}

function renderMarkdownCell (cell: MarkdownCell): HTMLElement {
  const el = makeElement('div', ['cell', 'markdown-cell'], nb.markdown(joinText(cell.source)))

  nb.renderMath(el, { delimiters: [
    { left: '$$', right: '$$', display: true },
    { left: '\\[', right: '\\]', display: true },
    { left: '\\(', right: '\\)', display: false },
    { left: '$', right: '$', display: false },
  ] })

  return el
}

function renderRawCell (cell: RawCell): HTMLElement {
  return makeElement('div', ['cell', 'raw-cell'], joinText(cell.source))
}

function renderCodeCell (cell: CodeCell, notebook: Notebook): HTMLElement {
  const outer = makeElement('div', ['cell', 'code-cell'])
  outer.appendChild(renderSource(cell, notebook))

  coalesceStreams(cell.outputs || [])
    .map(output => renderOutput(output, cell))
    .forEach(el => outer.appendChild(el))

  return outer
}

function renderSource (cell: CodeCell, notebook: Notebook): HTMLElement {
  if (!cell.source.length) {
    return makeElement('div')
  }
  // Class "input" is for backward compatibility with notebook.js.
  const holder = makeElement('div', ['source', 'input'])

  if (typeof cell.execution_count === 'number') {
    holder.setAttribute('data-execution-count', cell.execution_count.toString())
    // Only for backward compatibility with notebook.js.
    holder.setAttribute('data-prompt-number', cell.execution_count.toString())
  }
  const m = notebook.metadata
  const lang = (m.language_info && m.language_info.name) || (m.kernelspec && m.kernelspec.language)

  const preEl = makeElement('pre')
  const codeEl = makeElement('code')

  codeEl.setAttribute('data-language', lang)
  codeEl.className = `lang-${lang}`
  codeEl.innerHTML = nb.highlighter(escapeHTML(joinText(cell.source)), preEl, codeEl, lang)

  preEl.appendChild(codeEl)
  holder.appendChild(preEl)

  return holder
}

function renderOutput (output: Output, cell: CodeCell): HTMLElement {
  const outer = makeElement('div', ['output'])

  if (typeof cell.execution_count === 'number') {
    outer.setAttribute('data-execution-count', cell.execution_count.toString())
    // Only for backward compatibility with notebook.js.
    outer.setAttribute('data-prompt-number', cell.execution_count.toString())
  }

  const inner = (() => {
    switch (output.output_type) {
      case OutputType.DisplayData: // fallthrough
      case OutputType.ExecuteResult: return renderData(output)
      case OutputType.Stream: return renderStream(output)
      case OutputType.Error: return renderError(output)
    }
  })()
  outer.appendChild(inner)

  return outer
}

function renderData (output: DisplayData | ExecuteResult): HTMLElement {
  const format = nb.displayPriority.find(d => output.data[d])

  if (format && nb.display[format]) {
    return nb.display[format](joinText(output.data[format]))
  }
  return makeElement('div', ['empty-output'])
}

function renderError (error: NbError): HTMLElement {
  const raw = error.traceback.join('\n')

  // Class "pyerr" is for backward compatibility with notebook.js.
  const el = makeElement('pre', ['error', 'pyerr'])
  el.innerHTML = nb.highlighter(nb.ansi(escapeHTML(raw)), el)

  return el
}

function renderStream (stream: NbStream): HTMLElement {
  const el = makeElement('pre', [stream.name])
  const raw = joinText(stream.text)
  el.innerHTML = nb.highlighter(nb.ansi(escapeHTML(raw)), el)
  return el
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

export default nb
