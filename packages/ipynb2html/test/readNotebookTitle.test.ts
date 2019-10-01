import { Notebook, CellType, MarkdownCell } from '@/nbformat'
import readNotebookTitle from '@/readNotebookTitle'


const markdownCell = (source: string | string[]): MarkdownCell => ({
  cell_type: CellType.Markdown,
  metadata: {},
  source,
})

const baseNotebook: Notebook = {
  nbformat: 4,
  nbformat_minor: 3,
  metadata: {},
  cells: [
    markdownCell('# Markdown Title\n\nLorem ipsum dolor'),
  ],
}


describe('readNotebookTitle', () => {

  describe('when metadata contains title', () => {
    const notebook = {
      ...baseNotebook,
      metadata: {
        title: 'Metadata Title',
      },
    }

    it('returns title from the metadata', () => {
      expect( readNotebookTitle(notebook) ).toEqual('Metadata Title')
    })
  })


  describe('when metadata does not contain title', () => {
    const notebook = baseNotebook

    it('returns level 1 title from markdown cell', () => {
      expect( readNotebookTitle(notebook) ).toEqual('Markdown Title')
    })


    describe('when first cell is a Markdown cell', () => {

      describe('with a single level 1 title', () => {
        const notebook = {
          ...baseNotebook,
          cells: [
            markdownCell([
              '# *Title* Level 1\n',
              '\n',
              'Lorem ipsum\n',
              '\n',
              '## Title Level 2\n',
              '\n',
              'dolor sit amet\n',
            ]),
          ],
        }

        it('returns level 1 title with stripped formatting parsed from the first cell', () => {
          expect( readNotebookTitle(notebook) ).toEqual('Title Level 1')
        })
      })

      describe('with a single level 1 title not on the first line', () => {
        const notebook = {
          ...baseNotebook,
          cells: [
            markdownCell('Lorem ipsum\n\n# Title Level 1\n\ndolor sit amet.\n'),
          ],
        }

        it('returns level 1 title parsed from the first cell', () => {
          expect( readNotebookTitle(notebook) ).toEqual('Title Level 1')
        })
      })

      describe('with multiple first level titles', () => {
        const notebook = {
          ...baseNotebook,
          cells: [
            markdownCell(['# First Title\n\nLorem ipsum\n\n# Second Title\n\ndolor sit amet\n']),
          ],
        }

        it('returns the first level 1 title parsed from the first cell', () => {
          expect( readNotebookTitle(notebook) ).toEqual('First Title')
        })
      })

      describe('without any level 1 title', () => {
        const notebook = {
          ...baseNotebook,
          cells: [ markdownCell(['Lorem ipsum\n', 'dolor sit amet\n']) ],
        }

        it('returns an empty string', () => {
          expect( readNotebookTitle(notebook) ).toBe('')
        })
      })
    })

    describe('when first cell is not type Markdown', () => {
      const notebook: Notebook = {
        ...baseNotebook,
        cells: [
          {
            cell_type: CellType.Raw,
            source: 'Lorem ipsum\n',
            metadata: {},
          },
        ],
      }

      it('returns an empty string', () => {
        expect( readNotebookTitle(notebook) ).toBe('')
      })
    })

    describe('when there are no cells', () => {
      const notebook = {
        ...baseNotebook,
        cells: [],
      }

      it('returns an empty string', () => {
        expect( readNotebookTitle(notebook) ).toBe('')
      })
    })
  })
})
