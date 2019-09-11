// This code is originally based on notebookjs 0.4.2 distributed under the MIT license.
import { Document, HTMLElement } from 'nodom'

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
  highlighter: (code: string, lang: string) => string,
  renderMath: (element: HTMLElement, config: { [k: string]: any }) => void,
  display: DataRenderers,
  displayPriority: string[],
  render: (notebook: Notebook) => HTMLElement,
}

type Attributes = { [k: string]: string }

type DataRenderer = (data: string) => HTMLElement
type DataRenderers = { [mediaType: string]: DataRenderer }

const VERSION = '0.4.2'

const doc = new Document()

const ident = <T>(x: T): T => x

const katexConfig = {
  delimiters: [
    { left: '$$', right: '$$', display: true },
    { left: '\\[', right: '\\]', display: true },
    { left: '\\(', right: '\\)', display: false },
    { left: '$', right: '$', display: false },
  ],
}

// Set up `nb` namespace
const nb: Nb = {
  prefix: 'nb-',
  markdown: ident,
  ansi: ident,
  highlighter: ident,
  renderMath: (doc as any).renderMathInElement || ident,
  VERSION,
} as any

function makeElement (tag: string, classes?: string[], children?: HTMLElement[] | string): HTMLElement
function makeElement (tag: string, attrs?: Attributes, children?: HTMLElement[] | string): HTMLElement
function makeElement (
  tag: string,
  classesOrAttrs?: string[] | Attributes,
  childrenOrHTML?: HTMLElement[] | string,
): HTMLElement {

  const prefixClassName = (name: string) => name.startsWith('lang-') ? name : nb.prefix + name

  const el = doc.createElement(tag)

  if (Array.isArray(classesOrAttrs)) {
    el.className = classesOrAttrs.map(prefixClassName).join(' ')

  } else if (classesOrAttrs) {
    for (const [key, val] of Object.entries(classesOrAttrs)) {
      if (key === 'class') {
        el.className = val.split(' ').map(prefixClassName).join(' ')
      } else {
        el.setAttribute(key, val)
      }
    }
  }
  if (Array.isArray(childrenOrHTML)) {
    childrenOrHTML.forEach(e => el.appendChild(e))

  } else if (childrenOrHTML) {
    el.innerHTML = childrenOrHTML
  }
  return el
}

const escapeHTML = (raw: string) => raw.replace(/</g, '&lt;').replace(/>/g, '&gt;')

function joinText (text: string | string[]): string {
  return Array.isArray(text) ? text.map(joinText).join('') : text
}

// Outputs and output-renderers
const imageCreator = (format: string) => (data: string | string[]): HTMLElement => {
  return makeElement('img', {
    class: 'image-output',
    src: `data:image/${format};base64,${joinText(data).replace(/\n/g, '')}`,
  })
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


function executionCountAttrs ({ execution_count: count }: CodeCell): Attributes | undefined {
  return count ? {
    'data-execution-count': String(count),
    // Only for backward compatibility with notebook.js.
    'data-prompt-number': String(count),
  } : undefined
}

function renderNotebook (notebook: Notebook): HTMLElement {
  const children = notebook.cells.map(cell => renderCell(cell, notebook))

  // Class "worksheet" is for backward compatibility with notebook.js.
  return makeElement('div', ['notebook', 'worksheet'], children)
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
  nb.renderMath(el, katexConfig)

  return el
}

function renderRawCell (cell: RawCell): HTMLElement {
  return makeElement('div', ['cell', 'raw-cell'], joinText(cell.source))
}

function renderCodeCell (cell: CodeCell, notebook: Notebook): HTMLElement {
  const children = coalesceStreams(cell.outputs || [])
    .map(output => renderOutput(output, cell))

  children.unshift(renderSource(cell, notebook))

  return makeElement('div', ['cell', 'code-cell'], children)
}

function renderSource (cell: CodeCell, notebook: Notebook): HTMLElement {
  if (!cell.source.length) {
    return makeElement('div')
  }
  const m = notebook.metadata
  const lang = (m.language_info && m.language_info.name) || (m.kernelspec && m.kernelspec.language)

  const html = nb.highlighter(escapeHTML(joinText(cell.source)), lang)
  const codeEl = makeElement('code', { 'classes': `lang-${lang}`, 'data-language': lang }, html)
  const preEl = makeElement('pre', [], [codeEl])

  const attrs = {
    ...executionCountAttrs(cell),
    // Class "input" is for backward compatibility with notebook.js.
    class: 'source input',
  }
  return makeElement('div', attrs, [preEl])
}

function renderOutput (output: Output, cell: CodeCell): HTMLElement {
  const innerEl = (() => {
    switch (output.output_type) {
      case OutputType.DisplayData: // fallthrough
      case OutputType.ExecuteResult: return renderData(output)
      case OutputType.Stream: return renderStream(output)
      case OutputType.Error: return renderError(output)
    }
  })()

  const attrs = {
    ...executionCountAttrs(cell),
    class: 'output',
  }
  return makeElement('div', attrs, [innerEl])
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
  const html = nb.ansi(escapeHTML(raw))

  // Class "pyerr" is for backward compatibility with notebook.js.
  return makeElement('pre', ['error', 'pyerr'], html)
}

function renderStream (stream: NbStream): HTMLElement {
  const raw = joinText(stream.text)
  const html = nb.ansi(escapeHTML(raw))

  return makeElement('pre', [stream.name], html)
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
