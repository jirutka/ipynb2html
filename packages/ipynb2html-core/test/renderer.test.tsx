import '~/test/setup'  // setupFilesAfterEnv doesn't work here

import arrify from 'arrify'
import { Document, HTMLElement } from 'nodom'

import buildElementCreator from '@/elementCreator'
import buildRenderer, { NbRenderer, Options as RendererOpts } from '@/renderer'
import { DisplayData, MimeBundle, MultilineString, Notebook } from '@/nbformat'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Anything } from '~/test/support/matchers/toMatchElement'
import { mockLastResult, mockResults } from '~/test/support/helpers'
import * as _fixtures from './support/fixtures/notebook'

const document = new Document()
const fixtures = _fixtures  // workaround to allow indexed access


describe('built renderer', () => {
  const elementCreator = buildElementCreator(document.createElement.bind(document), '')
  const markdownRenderer = jest.fn(x => `<markdown>${x}</markdown>`)
  const ansiCodesRenderer = jest.fn(x => `<ansi>${x}</ansi>`)
  const codeHighlighter = jest.fn(x => `<highlight>${x}</highlight>`)

  const notebook = fixtures.Notebook

  const dataRenderers = {
    'text/custom': rendererMock('DisplayData'),
  }
  const rendererOpts: RendererOpts<HTMLElement> = {
    ansiCodesRenderer,
    codeHighlighter,
    markdownRenderer,
    dataRenderers,
  }
  let renderer: NbRenderer<HTMLElement>


  beforeEach(() => {
    renderer = buildRenderer(elementCreator, rendererOpts)
  })


  describe('.Notebook', () => {
    beforeEach(() => {
      renderer.Cell = rendererMock('Cell')
    })

    it('returns div.notebook', () => {
      expect( renderer.Notebook({ ...notebook, cells: [] }) ).toHtmlEqual(
        <div class="notebook"></div>
      )
    })

    it('returns element with $cells converted using .Cell() as the children', () => {
      const result = renderer.Notebook(notebook)

      notebook.cells.forEach((cell, idx) => {
        expect( renderer.Cell ).toHaveBeenNthCalledWith(idx + 1, cell, notebook)
      })
      expect( result.children ).toHtmlEqual(mockResults(renderer.Cell))
    })
  })


  describe('.Cell', () => {

    describe.each([
      'CodeCell', 'MarkdownCell', 'RawCell',
    ] as const)('with %s', (type) => {
      const cell = fixtures[type]

      it(`returns result of calling .${type}() with the given cell`, () => {
        const expected = stubElement(type)
        renderer[type] = jest.fn(() => expected)

        expect( renderer.Cell(cell, notebook) ).toBe(expected)
        expect( renderer[type] ).toBeCalledWith(cell, notebook)
      })
    })

    describe('with unsupported cell type', () => {
      const cell = {
        cell_type: 'whatever',
        metadata: {},
      } as any

      it('returns div with comment "Unsupported cell type"', () => {
        expect( renderer.Cell(cell, notebook) ).toHtmlEqual(
          <div>
            {{__html: '<!-- Unsupported cell type -->' }}
          </div>
        )
      })
    })
  })


  describe('.MarkdownCell', () => {
    eachMultilineVariant(fixtures.MarkdownCell, 'source', (cell) => {
      const source = join(cell.source)

      it('returns div.cell.markdown-cell with the $source converted using markdownRenderer() as content', () => {
        expect( renderer.MarkdownCell(cell, notebook) ).toHtmlEqual(
          <div class="cell markdown-cell">
            {{__html: mockLastResult(markdownRenderer) }}
          </div>
        )
        expect( markdownRenderer ).toBeCalledWith(source)
      })
    })
  })


  describe('.RawCell', () => {
    eachMultilineVariant(fixtures.RawCell, 'source', (cell) => {

      it('returns div.cell.raw-cell with the $source as content', () => {
        expect( renderer.RawCell(cell, notebook) ).toHtmlEqual(
          <div class="cell raw-cell">
            {{__html: join(cell.source) }}
          </div>
        )
      })
    })
  })


  describe('.CodeCell', () => {
    const cell = fixtures.CodeCell
    let result: HTMLElement

    beforeEach(() => {
      renderer.Source = rendererMock('Source')
      renderer.Output = rendererMock('Output')

      result = renderer.CodeCell(cell, notebook)
    })

    it('returns div.cell.code-cell', () => {
      expect( result ).toMatchElement(
        <div class="cell code-cell"><Anything /></div>
      )
    })

    describe('with non-empty $source', () => {

      it('returns element with $source rendered using .Source() as children[0]', () => {
        expect( renderer.Source ).toBeCalledWith(cell, notebook)
        expect( result.children[0] ).toHtmlEqual(mockLastResult(renderer.Source))
      })
    })

    describe('with empty $source', () => {
      beforeEach(() => {
        result = renderer.CodeCell({ ...cell, source: [] }, notebook)
      })

      it('returns element with empty div as children[0]', () => {
        expect( result.children[0] ).toHtmlEqual(
          <div></div>
        )
      })
    })

    it('returns element with $outputs rendered using .Output() as children[1+]', () => {
      cell.outputs.forEach((output, idx) => {
        expect( renderer.Output ).toHaveBeenNthCalledWith(idx + 1, output, cell)
      })
      expect( result.children.slice(1) ).toHtmlEqual(mockResults(renderer.Output))
    })
  })


  describe('.Source', () => {
    const cell = fixtures.CodeCell
    const notebookLang = notebook.metadata.language_info!.name
    let result: HTMLElement

    beforeEach(() => {
      result = renderer.Source(cell, notebook)
    })

    it('returns div > pre > code', () => {
      expect( result ).toMatchElement(
        <div>
          <pre>
            <code><Anything /></code>
          </pre>
        </div>,
        { ignoreAttrs: true }
      )
    })

    it("calls the codeHighlighter() with the notebook's language", () => {
      expect( codeHighlighter ).toBeCalledWith(expect.anything(), notebookLang)
    })

    describe('outer div', () => {

      it('has class "source input"', () => {
        expect( result.className ).toBe('source input')
      })

      describe('when the cell has non-null execution_count', () => {
        const myCell = { ...cell, execution_count: 2 }

        it('has data-execution-count and data-prompt-number attributes', () => {
          const result = renderer.Source(myCell, notebook)

          expect( result.attributes ).toMatchObject({
            'data-execution-count': String(myCell.execution_count),
            'data-prompt-number': String(myCell.execution_count),
          })
        })
      })

      describe('when the cell has null execution_count', () => {
        const myCell = { ...cell, execution_count: null }

        it('has data-execution-count and data-prompt-number attributes', () => {
          const result = renderer.Source(myCell, notebook)

          expect( result.attributes )
            .not.toHaveProperty('data-execution-count')
            .not.toHaveProperty('data-prompt-number')
        })
      })
    })

    describe('inner code', () => {
      let codeEl: HTMLElement

      beforeEach(() => {
        codeEl = renderer.Source(cell, notebook).firstChild!.firstChild as HTMLElement
      })

      it("has class lang-<lang> where lang is the notebook's language", () => {
        expect( codeEl.className ).toBe(`lang-${notebookLang}`)
      })

      it("has attribute data-language with the notebook's language", () => {
        expect( codeEl.getAttribute('data-language') ).toBe(notebookLang)
      })

      it('has $source converted using codeHighlighter() as the innerHTML', () => {
        expect( codeHighlighter ).toBeCalledWith(join(cell.source), expect.anything())
        expect( codeEl.innerHTML ).toEqual(mockLastResult(codeHighlighter))
      })
    })

    describe('when the notebook does not have metadata.language_info.name', () => {
      const myNotebook: Notebook = { ...notebook, metadata: {} }
      const notebookLang = 'python'

      it('uses the default language: python', () => {
        const result = renderer.Source(cell, myNotebook)
        const codeEl = result.firstChild!.firstChild as HTMLElement

        expect( codeEl.getAttribute('data-language') ).toBe(notebookLang)
        expect( codeEl.classList ).toContain(`lang-${notebookLang}`)
        expect( codeHighlighter ).toBeCalledWith(expect.anything(), notebookLang)
      })
    })
  })


  describe('.Output', () => {
    const cell = { ...fixtures.CodeCell, execution_count: null }

    describe.each([
      'DisplayData', 'ExecuteResult', 'Stream', 'Error',
    ] as const)('with %s output', (type) => {

      const output = fixtures[type]
      let result: HTMLElement

      beforeEach(() => {
        renderer[type] = rendererMock(type)
        result = renderer.Output(output, cell)
      })

      it('returns div.output', () => {
        expect( result ).toMatchElement(
          <div class="output"><Anything /></div>
        )
      })

      it(`returns element with the output rendered using .${type}() as the only child`, () => {
        expect( renderer[type] ).toBeCalledWith(output)
        expect( result.children ).toHtmlEqual([mockLastResult(renderer[type])])
      })

      describe('when the cell has non-null execution_count', () => {
        const cell = { ...fixtures.CodeCell, execution_count: 2 }

        it('returns element with attributes data-execution-count and data-prompt-number', () => {
          const result = renderer.Output(output, cell)

          expect( result.attributes ).toMatchObject({
            'data-execution-count': String(cell.execution_count),
            'data-prompt-number': String(cell.execution_count),
          })
        })
      })
    })

    describe('with unsupported output type', () => {
      const output = {
        output_type: 'whatever',
      } as any

      const cell = {
        ...fixtures.CodeCell,
        execution_count: null,
        output: [output],
      }

      it('returns div with comment "Unsupported output type"', () => {
        expect( renderer.Output(output, cell) ).toHtmlEqual(
          <div class="output">
            <div>
              {{__html: '<!-- Unsupported output type -->' }}
            </div>
          </div>
        )
      })
    })
  })


  describe('.DisplayData', () => {

    function displayDataWith (data: MimeBundle): DisplayData {
      return { ...fixtures.DisplayData, data }
    }

    function withMimeData (
      mimeType: string,
      value: MultilineString,
      fn: (output: DisplayData, value: MultilineString) => void,
    ): void {

      describe(mimeType, () => {
        describe('as a string', () => {
          const data = join(value)
          fn(displayDataWith({ [mimeType]: data }), data)
        })

        describe('as an array', () => {
          const data = arrify(value)
          fn(displayDataWith({ [mimeType]: data }), data)
        })
      })
    }

    describe('with single data of unsupported MIME type', () => {
      const displayData = displayDataWith({ 'text/non-sense': 'whaat' })

      it('returns div.empty-output', () => {
        expect( renderer.DisplayData(displayData) ).toHtmlEqual(
          <div class="empty-output"></div>
        )
      })
    })

    describe('with single data of built-in MIME type', () => {

      ;['image/png', 'image/jpeg'].forEach(mimeType => {
        withMimeData(mimeType, ['aW1hZ2Ug\n', 'ZGF0YQ=='], (output) => {

          it('returns img.image-output with the data in the src attribute', () => {
            expect( renderer.DisplayData(output) ).toHtmlEqual(
              <img class="image-output" src={`data:${mimeType};base64,aW1hZ2UgZGF0YQ==`}></img>
            )
          })
        })
      })

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      ;([
        /* mimeType     |  classes       */
        ['image/svg+xml', ['svg-output']  ],
        ['text/svg+xml' , ['svg-output']  ],
        ['text/html'    , ['html-output'] ],
        ['text/latex'   , ['latex-output']],
      ] as Array<[string, string[]]>).forEach(([mimeType, classes]) => {
        withMimeData(mimeType, '<stub>data</stub>', (output, data) => {

          it(`returns div${classes.map(x => `.${x}`)} with the data as content`, () => {
            expect( renderer.DisplayData(output) ).toHtmlEqual(
              <div class={ classes.join(' ') }>
                {{__html: join(data) }}
              </div>
            )
          })
        })
      })

      withMimeData('text/markdown', ['Lorem\n', 'ipsum'], (output, data) => {

        it('returns div.html-output with the data converted using markdownRenderer() as content', () => {
          expect( renderer.DisplayData(output) ).toHtmlEqual(
            <div class="html-output">
              {{__html: mockLastResult(markdownRenderer) }}
            </div>
          )
          expect( markdownRenderer ).toBeCalledWith(join(data))
        })
      })

      withMimeData('text/plain', '>_<', (output) => {

        it('returns pre.text-output with html-escaped data', () => {
          expect( renderer.DisplayData(output) ).toHtmlEqual(
            <pre class="text-output">{ '>_<' }</pre>
          )
        })
      })

      withMimeData('application/javascript', 'alert("Hello &!")', (output, data) => {

        it('returns script with the data', () => {
          expect( renderer.DisplayData(output) ).toHtmlEqual(
            <script>{{__html: join(data) }}</script>
          )
        })
      })
    })

    describe('with single data of non-built-in MIME type', () => {

      withMimeData('text/custom', 'Lorem ipsum', (output, data) => {

        it('renders the data using the associated external renderer', () => {
          expect( renderer.DisplayData(output) ).toHtmlEqual(
            mockLastResult(dataRenderers['text/custom'])
          )
          expect( dataRenderers['text/custom'] ).toBeCalledWith(join(data))
        })
      })
    })

    describe('with multiple data', () => {
      const mimeBundle = {
        'text/plain': 'Lorem ipsum',
        'text/html': '<p>Lorem ipsum</p>',
        'text/unknown': '???',
      }
      const output = displayDataWith(mimeBundle)

      it('renders the data of the MIME type with a higher priority', () => {
        expect( renderer.DisplayData(output) ).toHtmlEqual(
          <div class="html-output">
            {{__html: mimeBundle['text/html'] }}
          </div>
        )
      })

      test('the provided dataRenderers have higher priority than the built-ins', () => {
        const mimeBundle = {
          'text/custom': '>>Lorem ipsum<<',
          'text/html': '<p>Lorem ipsum</p>',
        }
        const output = displayDataWith(mimeBundle)

        expect( renderer.DisplayData(output) ).toHtmlEqual(
          mockLastResult(dataRenderers['text/custom'])
        )
      })
    })

    describe('when built with external renderer for the built-in type', () => {
      const dataRenderer = rendererMock('DisplayData')

      beforeEach(() => {
        renderer = buildRenderer(elementCreator, {
          ...rendererOpts,
          dataRenderers: { 'text/plain': dataRenderer },
        })
      })

      it('renders the data using the external renderer instead of the built-in', () => {
        const data = 'allons-y!'
        const output = displayDataWith({ 'text/plain': [data] })

        expect( renderer.DisplayData(output) ).toBe(mockLastResult(dataRenderer))
        expect( dataRenderer ).toBeCalledWith(data)
      })
    })
  })


  describe('.Error', () => {
    const error = fixtures.Error
    const traceback = error.traceback.join('\n')

    it('returns pre.error.pyerr with inner $traceback converted using ansiCodesRenderer', () => {
      expect( renderer.Error(error) ).toHtmlEqual(
        <pre class="error pyerr">
          {{__html: mockLastResult(ansiCodesRenderer) }}
        </pre>
      )
      expect( ansiCodesRenderer ).toBeCalledWith(traceback)
    })
  })


  describe('.Stream', () => {
    eachMultilineVariant(fixtures.Stream, 'text', (stream) => {
      const text = join(stream.text)

      it('returns pre.$name with inner $text converted using ansiCodesRenderer', () => {
        expect( renderer.Stream(stream) ).toHtmlEqual(
          <pre class={ stream.name }>
            {{__html: mockLastResult(ansiCodesRenderer) }}
          </pre>
        )
        expect( ansiCodesRenderer ).toBeCalledWith(text)
      })
    })
  })
})


function eachMultilineVariant <T extends { [P in K]: MultilineString }, K extends keyof T> (
  obj: T,
  propName: K,
  fn: (obj: T) => void,
): void {
  const propValue = obj[propName]

  describe(`when ${propName} is an array`,
    () => fn({ ...obj, [propName]: arrify(propValue) }))

  describe(`when ${propName} is a string`,
    () => fn({ ...obj, [propName]: join(propValue) }))
}

const genStubElement = jest.fn((type: string) => {
  const id = genStubElement.mock.calls.filter(args => args[0] === type).length

  const el = document.createElement('stub')
  el.setAttribute('type', type)
  el.setAttribute('id', id.toString())

  return el
})

function stubElement (type: string): HTMLElement {
  return genStubElement(type)
}

function rendererMock (type: string) {
  return jest.fn(() => stubElement(type))
}

function join (input: MultilineString): string {
  return Array.isArray(input) ? input.join('') : input
}
