import { Document } from 'nodom'

import buildElementCreator from '@/elementCreator'
import htmlRenderer from '@/htmlRenderer'


describe('htmlRenderer', () => {
  const doc = new Document()
  const elementCreator = buildElementCreator(doc.createElement.bind(doc), '')
  const mathRenderer = jest.fn(math => math)

  const renderHtml = htmlRenderer({ elementCreator, mathRenderer })


  describe('with SageMath\'s embedded TeX', () => {
    const math = '\\newcommand{\\Bold}[1]{\\mathbf{#1}}\\Bold{Z}'
    const data = `<html><script type="math/tex; mode=display">${math}</script></html>`

    it('returns <div class="latex-output">${math}</div>', () => {
      expect( renderHtml(data) ).toEqual(elementCreator('div', ['latex-output'], math))
      expect( mathRenderer ).toBeCalledWith(math)
    })
  })

  describe('with other HTML', () => {
    const data = '<p>Lorem ipsum</p>'

    it('returns <div class="html-output">${data}</div>', () => {
      expect( renderHtml(data) ).toEqual(elementCreator('div', ['html-output'], data))
      expect( mathRenderer ).not.toBeCalled()
    })
  })
})
