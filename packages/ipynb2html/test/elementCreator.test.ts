import { Document } from 'nodom'

import buildElementCreator from '@/elementCreator'


const doc = new Document()

const el1 = (() => {
  const el = doc.createElement('p')
  el.className = 'fixture'
  el.textContent = 'child-1'
  return el
})()

const el2 = (() => {
  const el = doc.createElement('img')
  el.setAttribute('src', 'pic.png')
  return el
})()


describe('created function', () => {
  const prefix = 'x-'
  const makeElement = buildElementCreator(doc.createElement.bind(doc), prefix)
  let exp = doc.createElement('div')


  describe('with tag', () => {

    it('returns an HTMLElement for the specified tag', () => {
      expect( makeElement('div') ).toHtmlEqual(exp)
    })

    describe('and classes', () => {
      const tag = 'img'
      const classes = ['foo', 'bar']

      beforeEach(() => {
        exp = doc.createElement(tag)
        exp.className = `${prefix}foo ${prefix}bar`
      })

      it('returns an HTMLElement with the specified classes prefixed', () => {
        expect( makeElement(tag, classes) ).toHtmlEqual(exp)
      })

      it('does not prefix class name starting with lang-', () => {
        expect( makeElement(tag, ['lang-js']).className ).toEqual('lang-js')
      })

      describe('and child elements', () => {

        it('returns an HTMLElement with the given children', () => {
          exp.appendChild(el1)
          exp.appendChild(el2)

          expect( makeElement(tag, classes, [el1, el2]) ).toHtmlEqual(exp)
        })
      })

      describe('and inner HTML', () => {

        it('returns an HTMLElement with the given inner HTML', () => {
          exp.innerHTML = el1.outerHTML

          expect( makeElement(tag, classes, el1.outerHTML) ).toHtmlEqual(exp)
        })
      })
    })

    describe('and attributes', () => {
      const tag = 'img'
      const attrs = { src: 'img.png', alt: 'picture' }

      beforeEach(() => {
        exp = doc.createElement(tag)
        for (const [key, val] of Object.entries(attrs)) {
          exp.setAttribute(key, val)
        }
      })

      it('returns an HTMLElement with the given attributes', () => {
        expect( makeElement('img', attrs) ).toHtmlEqual(exp)
      })

      it('prefixes items of the class attribute that do not start with lang-', () => {
        expect(
          makeElement(tag, { src: 'img.png', class: 'foo lang-js' }).className
        ).toEqual(`${prefix}foo lang-js`)
      })

      describe('and child elements', () => {

        it('returns an HTMLElement with the given children', () => {
          exp.appendChild(el1)
          exp.appendChild(el2)

          expect( makeElement(tag, attrs, [el1, el2]) ).toHtmlEqual(exp)
        })
      })

      describe('and inner HTML', () => {

        it('returns an HTMLElement with the given inner HTML', () => {
          exp.innerHTML = el1.outerHTML

          expect( makeElement(tag, attrs, el1.outerHTML) ).toHtmlEqual(exp)
        })
      })
    })
  })
})
