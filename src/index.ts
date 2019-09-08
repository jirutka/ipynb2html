// This code is originally based on notebookjs 0.4.2 distributed under the MIT license.
import AnsiUp from 'ansi_up'
import jsdom from 'jsdom'
import marked from 'marked'

import * as nbf from './nbformat'

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
  parse: (nbjson: nbf.Notebook) => Notebook,
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

export class Source {

  constructor (public raw: string | string[], public cell: Cell) {
  }

  render (): HTMLElement {
    if (!this.raw.length) {
      return makeElement('div')
    }
    // Class "input" is for backward compatibility with notebook.js.
    const holder = makeElement('div', ['source', 'input'])
    const cell = this.cell

    if (typeof cell.executionCount === 'number') {
      holder.setAttribute('data-execution-count', this.cell.executionCount.toString())
      // Only for backward compatibility with notebook.js.
      holder.setAttribute('data-prompt-number', this.cell.executionCount.toString())
    }
    const preEl = makeElement('pre')
    const codeEl = makeElement('code')

    const m = cell.notebook.metadata
    const lang = (m.language_info && m.language_info.name) || (m.kernelspec && m.kernelspec.language)

    codeEl.setAttribute('data-language', lang)
    codeEl.className = `lang-${lang}`
    codeEl.innerHTML = nb.highlighter(escapeHTML(joinText(this.raw)), preEl, codeEl, lang)

    preEl.appendChild(codeEl)
    holder.appendChild(preEl)

    return holder
  }
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

function renderDisplayData (this: Output): HTMLElement {
  const format = nb.displayPriority.find(d => this.raw.data[d])

  if (format && nb.display[format]) {
    return nb.display[format](joinText(this.raw.data[format]))
  }
  return makeElement('div', ['empty-output'])
}

function renderError (this: Output): HTMLElement {
  // Class "pyerr" is for backward compatibility with notebook.js.
  const el = makeElement('pre', ['error', 'pyerr'])
  const raw = this.raw.traceback.join('\n')

  el.innerHTML = nb.highlighter(nb.ansi(escapeHTML(raw)), el)

  return el
}

export class Output {

  type: nbf.OutputType

  /* eslint-disable @typescript-eslint/camelcase */
  renderers = {
    display_data: renderDisplayData,
    execute_result: renderDisplayData,
    error: renderError,
    stream (this: Output) {
      const el = makeElement('pre', [this.raw.name])
      const raw = joinText(this.raw.text)
      el.innerHTML = nb.highlighter(nb.ansi(escapeHTML(raw)), el)
      return el
    },
  }
  /* eslint-enable @typescript-eslint/camelcase */

  constructor (public raw: nbf.Output, public cell: Cell) {
    this.type = raw.output_type
  }

  render (): HTMLElement {
    const outer = makeElement('div', ['output'])

    if (typeof this.cell.executionCount === 'number') {
      outer.setAttribute('data-execution-count', this.cell.executionCount.toString())
      // Only for backward compatibility with notebook.js.
      outer.setAttribute('data-prompt-number', this.cell.executionCount.toString())
    }
    const inner = this.renderers[this.type].call(this)
    outer.appendChild(inner)

    return outer
  }
}

// Post-processing
function coalesceStreams (outputs: Output[]): Output[] {
  if (!outputs.length) { return outputs }

  let last = outputs[0]
  const newOutputs = [last]

  for (const output of outputs.slice(1)) {
    if (output.raw.output_type === 'stream' && last.raw.output_type === 'stream' && output.raw.name === last.raw.name) {
      last.raw.text = last.raw.text.concat(output.raw.text)
    } else {
      newOutputs.push(output)
      last = output
    }
  }
  return newOutputs
}

export class Cell {

  type: nbf.CellType
  executionCount?: number | null
  source?: Source
  outputs?: Output[]

  renderers = {
    markdown (this: Cell) {
      const el = makeElement('div', ['cell', 'markdown-cell'], nb.markdown(joinText(this.raw.source)))

      nb.renderMath(el, { delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '\\[', right: '\\]', display: true },
        { left: '\\(', right: '\\)', display: false },
        { left: '$', right: '$', display: false },
      ] })

      return el
    },
    raw (this: Cell) {
      return makeElement('div', ['cell', 'raw-cell'], joinText(this.raw.source))
    },
    code (this: Cell) {
      const el = makeElement('div', ['cell', 'code-cell'])
      el.appendChild(this.source.render())

      for (const output of this.outputs) {
        el.appendChild(output.render())
      }
      return el
    },
  }

  constructor (public raw: nbf.Cell, public notebook: Notebook) {
    this.type = raw.cell_type

    if (raw.cell_type === 'code') {
      this.executionCount = raw.execution_count

      const source = raw.source
      this.source = new Source(source, this)

      const rawOutputs = (raw.outputs || []).map(output => new Output(output, this))
      this.outputs = coalesceStreams(rawOutputs)
    }
  }

  render (): HTMLElement {
    return this.renderers[this.type].call(this)
  }
}

export class Notebook {

  metadata: nbf.NotebookMetadata
  title: string
  cells: Cell[]

  constructor (public raw: nbf.Notebook) {
    const meta = this.metadata = raw.metadata || {}
    this.title = meta.title || meta.name

    this.cells = raw.cells.map(cell => new Cell(cell, this))
  }

  render () {
    // Class "worksheet" is for backward compatibility with notebook.js.
    const el = makeElement('div', ['notebook', 'worksheet'])

    for (const cell of this.cells) {
      el.appendChild(cell.render())
    }
    return el
  }
}

nb.parse = function (nbjson: nbf.Notebook) {
  return new Notebook(nbjson)
}

export default nb
