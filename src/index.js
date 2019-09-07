// This code is originally based on notebookjs 0.4.2 distributed under the MIT license.
import ansiUp from 'ansi_up'
import jsdom from 'jsdom'
import marked from 'marked'

const VERSION = '0.4.2'

const doc = new jsdom.JSDOM().window.document

const ident = (x) => x

// Set up `nb` namespace
const nb = {
  prefix: 'nb-',
  markdown: marked,
  ansi: ansiUp.ansi_to_html,
  highlighter: ident,
  renderMath: doc.renderMathInElement || ident,
  VERSION,
}

function makeElement (tag, classNames) {
  const el = doc.createElement(tag)
  el.className = (classNames || []).map(cn => nb.prefix + cn).join(' ')
  return el
}

const escapeHTML = (raw) => raw.replace(/</g, '&lt;').replace(/>/g, '&gt;')

function joinText (text) {
  return text.join ? text.map(joinText).join('') : text
}

export class Source {

  constructor (raw, cell) {
    this.raw = raw
    this.cell = cell
  }

  render () {
    if (!this.raw.length) {
      return makeElement('div')
    }
    // Class "input" is for backward compatibility with notebook.js.
    const holder = makeElement('div', ['source', 'input'])
    const cell = this.cell

    if (typeof cell.executionCount === 'number') {
      holder.setAttribute('data-execution-count', this.cell.executionCount)
      // Only for backward compatibility with notebook.js.
      holder.setAttribute('data-prompt-number', this.cell.executionCount)
    }
    const preEl = makeElement('pre')
    const codeEl = makeElement('code')

    const notebook = cell.worksheet.notebook
    const m = notebook.metadata
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
const imageCreator = (format) => (data) => {
  const el = makeElement('img', ['image-output'])
  el.src = `data:image/${format};base64,${joinText(data).replace(/\n/g, '')}`
  return el
}

nb.display = {
  text: (data) => {
    const el = makeElement('pre', ['text-output'])
    el.innerHTML = escapeHTML(joinText(data))
    return el
  },
  html: (data) => {
    const el = makeElement('div', ['html-output'])
    el.innerHTML = joinText(data)
    return el
  },
  marked: (data) => nb.display.html(nb.markdown(joinText(data))),
  svg: (svg) => {
    const el = makeElement('div', ['svg-output'])
    el.innerHTML = joinText(svg)
    return el
  },
  latex: (data) => {
    const el = makeElement('div', ['latex-output'])
    el.innerHTML = joinText(data)
    return el
  },
  javascript: (data) => {
    const el = makeElement('script')
    el.innerHTML = joinText(data)
    return el
  },
  png: imageCreator('png'),
  jpeg: imageCreator('jpeg'),
}

Object.entries({
  'text/plain': 'text',
  'text/html': 'html',
  'text/markdown': 'marked',
  'text/svg+xml': 'svg',
  'image/svg+xml': 'svg',
  'text/latex': 'latex',
  'application/javascript': 'javascript',
  'image/png': 'png',
  'image/jpeg': 'jpeg',
}).forEach(([src, tgt]) => {
  nb.display[src] = nb.display[tgt]
})

nb.displayPriority = [
  'png',
  'image/png',
  'jpeg',
  'image/jpeg',
  'svg',
  'image/svg+xml',
  'text/svg+xml',
  'html',
  'text/html',
  'text/markdown',
  'latex',
  'text/latex',
  'javascript',
  'application/javascript',
  'text',
  'text/plain',
]

function renderDisplayData () {
  const format = nb.displayPriority.find(d => this.raw.data ? this.raw.data[d] : this.raw[d])

  if (format && nb.display[format]) {
    return nb.display[format](this.raw[format] || this.raw.data[format])
  }
  return makeElement('div', ['empty-output'])
}

function renderError () {
  const el = makeElement('pre', ['pyerr'])
  const raw = this.raw.traceback.join('\n')

  el.innerHTML = nb.highlighter(nb.ansi(escapeHTML(raw)), el)

  return el
}

export class Output {

  /* eslint-disable @typescript-eslint/camelcase */
  renderers = {
    display_data: renderDisplayData,
    execute_result: renderDisplayData,
    pyout: renderDisplayData,
    pyerr: renderError,
    error: renderError,
    stream: () => {
      const el = makeElement('pre', [(this.raw.stream || this.raw.name)])
      const raw = joinText(this.raw.text)
      el.innerHTML = nb.highlighter(nb.ansi(escapeHTML(raw)), el)
      return el
    },
  }
  /* eslint-enable @typescript-eslint/camelcase */

  constructor (raw, cell) {
    this.raw = raw
    this.cell = cell
    this.type = raw.output_type
  }

  render () {
    const outer = makeElement('div', ['output'])

    if (typeof this.cell.executionCount === 'number') {
      outer.setAttribute('data-execution-count', this.cell.executionCount)
      // Only for backward compatibility with notebook.js.
      outer.setAttribute('data-prompt-number', this.cell.executionCount)
    }
    const inner = this.renderers[this.type].call(this)
    outer.appendChild(inner)

    return outer
  }
}

// Post-processing
function coalesceStreams (outputs) {
  if (!outputs.length) { return outputs }

  let last = outputs[0]
  const newOutputs = [last]

  for (const output of outputs.slice(1)) {
    if (output.raw.output_type === 'stream' && last.raw.output_type === 'stream' && output.raw.stream === last.raw.stream) {
      last.raw.text = last.raw.text.concat(output.raw.text)
    } else {
      newOutputs.push(output)
      last = output
    }
  }
  return newOutputs
}

export class Cell {

  renderers = {
    markdown () {
      const el = makeElement('div', ['cell', 'markdown-cell'])
      el.innerHTML = nb.markdown(joinText(this.raw.source))

      nb.renderMath(el, { delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '\\[', right: '\\]', display: true },
        { left: '\\(', right: '\\)', display: false },
        { left: '$', right: '$', display: false },
      ] })

      return el
    },
    raw () {
      const el = makeElement('div', ['cell', 'raw-cell'])
      el.innerHTML = joinText(this.raw.source)
      return el
    },
    code () {
      const el = makeElement('div', ['cell', 'code-cell'])
      el.appendChild(this.source.render())

      for (const output of this.outputs) {
        el.appendChild(output.render())
      }
      return el
    },
  }

  constructor (raw, worksheet) {
    this.raw = raw
    this.worksheet = worksheet
    this.type = raw.cell_type

    if (this.type === 'code') {
      this.executionCount = raw.execution_count

      const source = [raw.source]
      this.source = new Source(source, this)

      const rawOutputs = (this.raw.outputs || []).map(output => new Output(output, this))
      this.outputs = coalesceStreams(rawOutputs)
    }
  }

  render () {
    return this.renderers[this.type].call(this)
  }
}

export class Worksheet {

  constructor (raw, notebook) {
    this.raw = raw
    this.notebook = notebook
    this.cells = raw.cells.map(cell => new Cell(cell, this))
  }

  render () {
    const el = makeElement('div', ['worksheet'])

    for (const cell of this.cells) {
      el.appendChild(cell.render())
    }
    return el
  }
}

export class Notebook {

  constructor (raw) {
    this.raw = raw

    const meta = this.metadata = raw.metadata || {}
    this.title = meta.title || meta.name

    const worksheets = raw.worksheets || [{ cells: raw.cells }]
    this.worksheets = worksheets.map(sheet => new Worksheet(sheet, this))

    this.sheet = this.worksheets[0]
  }

  render () {
    const el = makeElement('div', ['notebook'])

    for (const sheet of this.worksheets) {
      el.appendChild(sheet.render())
    }
    return el
  }
}

nb.parse = function (nbjson) {
  return new Notebook(nbjson)
}

export default nb
