// This code is originally based on notebookjs 0.4.2 distributed under the MIT license.
import ansiUp from 'ansi_up'
import jsdom from 'jsdom'
import marked from 'marked'

const root = this
const VERSION = '0.4.2'

const doc = new jsdom.JSDOM().window.document

// Helper functions
const ident = x => x

function makeElement (tag, classNames) {
  const el = doc.createElement(tag)
  el.className = (classNames || []).map(cn => nb.prefix + cn).join(' ')
  return el
}

function escapeHTML (raw) {
  const replaced = raw
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return replaced
}

function joinText (text) {
  if (text.join) {
    return text.map(joinText).join('')
  } else {
    return text
  }
}

// Set up `nb` namespace
const nb = {
  prefix: 'nb-',
  markdown: marked,
  ansi: ansiUp.ansi_to_html,
  highlighter: ident,
  VERSION
}

// Inputs
class Input {

  constructor (raw, cell) {
    this.raw = raw
    this.cell = cell
  }

  render () {
    if (!this.raw.length) { return makeElement('div') }
    const holder = makeElement('div', ['input'])
    const cell = this.cell
    if (typeof cell.number === 'number') {
      holder.setAttribute('data-prompt-number', this.cell.number)
    }
    const preEl = makeElement('pre')
    const codeEl = makeElement('code')
    const notebook = cell.worksheet.notebook
    const m = notebook.metadata
    const lang = this.cell.raw.language || m.language || (m.kernelspec && m.kernelspec.language) || (m.language_info && m.language_info.name)
    codeEl.setAttribute('data-language', lang)
    codeEl.className = `lang-${lang}`
    codeEl.innerHTML = nb.highlighter(escapeHTML(joinText(this.raw)), preEl, codeEl, lang)
    preEl.appendChild(codeEl)
    holder.appendChild(preEl)
    this.el = holder
    return holder
  }
}
nb.Input = Input

// Outputs and output-renderers
const imageCreator = format => data => {
  const el = makeElement('img', ['image-output'])
  el.src = `data:image/${format};base64,${joinText(data).replace(/\n/g, '')}`
  return el
}

nb.display = {}
nb.display.text = text => {
  const el = makeElement('pre', ['text-output'])
  el.innerHTML = escapeHTML(joinText(text))
  return el
}
nb.display['text/plain'] = nb.display.text

nb.display.html = html => {
  const el = makeElement('div', ['html-output'])
  el.innerHTML = joinText(html)
  return el
}
nb.display['text/html'] = nb.display.html

nb.display.marked = md => nb.display.html(nb.markdown(joinText(md)))
nb.display['text/markdown'] = nb.display.marked

nb.display.svg = svg => {
  const el = makeElement('div', ['svg-output'])
  el.innerHTML = joinText(svg)
  return el
}
nb.display['text/svg+xml'] = nb.display.svg
nb.display['image/svg+xml'] = nb.display.svg

nb.display.latex = latex => {
  const el = makeElement('div', ['latex-output'])
  el.innerHTML = joinText(latex)
  return el
}
nb.display['text/latex'] = nb.display.latex

nb.display.javascript = js => {
  const el = makeElement('script')
  el.innerHTML = joinText(js)
  return el
}
nb.display['application/javascript'] = nb.display.javascript

nb.display.png = imageCreator('png')
nb.display['image/png'] = nb.display.png
nb.display.jpeg = imageCreator('jpeg')
nb.display['image/jpeg'] = nb.display.jpeg

nb.displayPriority = [
  'png', 'image/png', 'jpeg', 'image/jpeg',
  'svg', 'image/svg+xml', 'text/svg+xml', 'html', 'text/html',
  'text/markdown', 'latex', 'text/latex',
  'javascript', 'application/javascript',
  'text', 'text/plain'
]

function renderDisplayData () {
  const o = this
  const formats = nb.displayPriority.filter(d => o.raw.data ? o.raw.data[d] : o.raw[d])
  const format = formats[0]
  if (format) {
    if (nb.display[format]) {
      return nb.display[format](o.raw[format] || o.raw.data[format])
    }
  }
  return makeElement('div', ['empty-output'])
}

function renderError () {
  const el = makeElement('pre', ['pyerr'])
  const raw = this.raw.traceback.join('\n')
  el.innerHTML = nb.highlighter(nb.ansi(escapeHTML(raw)), el)
  return el
}

class Output {

  /* eslint-disable @typescript-eslint/camelcase */
  renderers = {
    display_data: renderDisplayData,
    execute_result: renderDisplayData,
    pyout: renderDisplayData,
    pyerr: renderError,
    error: renderError,
    stream: function () {
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
    if (typeof this.cell.number === 'number') {
      outer.setAttribute('data-prompt-number', this.cell.number)
    }
    const inner = this.renderers[this.type].call(this)
    outer.appendChild(inner)
    this.el = outer
    return outer
  }
}
nb.Output = Output

// Post-processing
nb.coalesceStreams = outputs => {
  if (!outputs.length) { return outputs }
  let last = outputs[0]
  const newOutputs = [last]
  outputs.slice(1).forEach(o => {
    if (o.raw.output_type === 'stream' &&
      last.raw.output_type === 'stream' &&
      o.raw.stream === last.raw.stream) {
      last.raw.text = last.raw.text.concat(o.raw.text)
    } else {
      newOutputs.push(o)
      last = o
    }
  })
  return newOutputs
}

class Cell {

  renderers = {
    markdown () {
      const el = makeElement('div', ['cell', 'markdown-cell'])
      el.innerHTML = nb.markdown(joinText(this.raw.source))

      /* Requires to render KaTeX
      'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.10.0/katex.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.10.0/katex.min.css',
      'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.10.0/contrib/auto-render.min.js',
      */
      if (root.renderMathInElement != null) {
        root.renderMathInElement(el, {delimiters: [
          {left: '$$', right: '$$', display: true},
          {left: '\\[', right: '\\]', display: true},
          {left: '\\(', right: '\\)', display: false},
          {left: '$', right: '$', display: false}
        ]})
      }

      return el
    },
    heading () {
      const el = makeElement(`h${this.raw.level}`, ['cell', 'heading-cell'])
      el.innerHTML = joinText(this.raw.source)
      return el
    },
    raw () {
      const el = makeElement('div', ['cell', 'raw-cell'])
      el.innerHTML = joinText(this.raw.source)
      return el
    },
    code () {
      const cellEl = makeElement('div', ['cell', 'code-cell'])
      cellEl.appendChild(this.input.render())
      const outputEls = this.outputs.forEach(o => {
        cellEl.appendChild(o.render())
      })
      return cellEl
    },
  }

  constructor (raw, worksheet) {
    const cell = this
    cell.raw = raw
    cell.worksheet = worksheet
    cell.type = raw.cell_type
    if (cell.type === 'code') {
      cell.number = raw.prompt_number > -1 ? raw.prompt_number : raw.execution_count
      const source = raw.input || [raw.source]
      cell.input = new nb.Input(source, cell)
      const rawOutputs = (cell.raw.outputs || []).map(o => new nb.Output(o, cell))
      cell.outputs = nb.coalesceStreams(rawOutputs)
    }
  }

  render () {
    const el = this.renderers[this.type].call(this)
    this.el = el
    return el
  }
}
nb.Cell = Cell

class Worksheet {

  constructor (raw, notebook) {
    const worksheet = this
    this.raw = raw
    this.notebook = notebook
    this.cells = raw.cells.map(c => new nb.Cell(c, worksheet))
  }

  render () {
    const worksheetEl = makeElement('div', ['worksheet'])
    this.cells.forEach(c => {
      worksheetEl.appendChild(c.render())
    })
    this.el = worksheetEl
    return worksheetEl
  }
}
nb.Worksheet = Worksheet

class Notebook {

  constructor (raw, config) {
    const notebook = this
    this.raw = raw
    this.config = config
    const meta = this.metadata = raw.metadata || {}
    this.title = meta.title || meta.name
    const _worksheets = raw.worksheets || [{ cells: raw.cells }]
    this.worksheets = _worksheets.map(ws => new nb.Worksheet(ws, notebook))
    this.sheet = this.worksheets[0]
  }

  render () {
    const notebookEl = makeElement('div', ['notebook'])
    this.worksheets.forEach(w => {
      notebookEl.appendChild(w.render())
    })
    this.el = notebookEl
    return notebookEl
  }
}
nb.Notebook = Notebook

nb.parse = (nbjson, config) => new nb.Notebook(nbjson, config)

export default nb
