import { KatexOptions } from 'katex'
import parseHtml from 'node-html-parser'

import markdownRenderer, { MarkedOptions } from '@/markdownRenderer'

import '~/test/setup'  // setupFilesAfterEnv doesn't work here
import { Anything } from '~/test/support/matchers/toMatchElement'


let katexOpts: KatexOptions
let markedOpts: MarkedOptions

beforeEach(() => {
  katexOpts = {
    displayMode: true,
    throwOnError: false,
  }
  markedOpts = {}
})


describe('headings', () => {

  it('renders h tag without anchor', () => {
    expect( render('## Some Title') ).toHtmlEqual(
      <h2 id="some-title">Some Title</h2>
    )
  })

  it('renders math in text, but strips it in id', () => {
    expect( render('## Integers $\\mathbb{Z}$') ).toMatchElement(
      <h2 id="integers">
        Integers <span class="katex"><Anything /></span>
      </h2>
    )
  })

  describe('when headerAnchors is true', () => {
    beforeEach(() => {
      markedOpts = { headerAnchors: true }
    })

    it('renders h tag with anchor', () => {
      expect( render('## Some Title') ).toHtmlEqual(
        <h2 id="some-title">
          <a class="anchor" href="#some-title" aria-hidden="true"></a>Some Title
        </h2>
      )
    })

    it('renders math in text, but strips it in href and id', () => {
      expect( render('## Integers $\\mathbb{Z}$') ).toMatchElement(
        <h2 id="integers">
          <a class="anchor" href="#integers" aria-hidden="true"></a>
          Integers <span class="katex"><Anything /></span>
        </h2>
      )
    })
  })

  describe('when headerIds is false', () => {
    beforeEach(() => {
      markedOpts = { headerIds: false }
    })

    it('renders h tag without id and anchor', () => {
      expect( render('## Some Title') ).toHtmlEqual(
        <h2>Some Title</h2>
      )
    })
  })

  describe('when headerIdsStripAccents is true', () => {
    beforeEach(() => {
      markedOpts = { headerIdsStripAccents: true }
    })

    it('strips accents in generated id', () => {
      expect( render('## Příliš žluťoučký kůň') ).toHtmlEqual(
        <h2 id="prilis-zlutoucky-kun">
          Příliš žluťoučký kůň
        </h2>
      )
    })
  })
})


describe('link', () => {

  it('strips math in title', () => {
    expect( render('[link](https://example.org "This is $\\TeX$!")') ).toHtmlEqual(
      <p><a href="https://example.org" title="This is !">link</a></p>
    )
  })

  it('strips math in href', () => {
    expect( render('[link](https://example.org/$\\TeX$)') ).toHtmlEqual(
      <p><a href="https://example.org/">link</a></p>
    )
  })

  it('renders math in text', () => {
    expect( render('[This is $\\TeX$!](https://example.org/)') ).toMatchElement(
      <p><a href="https://example.org/">This is <span class="katex"><Anything /></span>!</a></p>
    )
  })
})


describe('image', () => {

  it('strips math in title', () => {
    expect( render('![x](https://example.org/img.png "This is $\\TeX$!")') ).toHtmlEqual(
      <p><img src="https://example.org/img.png" alt="x" title="This is !" /></p>
    )
  })

  it('strips math in href', () => {
    expect( render('![image](https://example.org/$\\TeX$.png)') ).toHtmlEqual(
      <p><img src="https://example.org/.png" alt="image" /></p>
    )
  })

  it('strips math in alt text', () => {
    expect( render('![This is $\\TeX$!](https://example.org/img.png)') ).toHtmlEqual(
      <p><img src="https://example.org/img.png" alt="This is !" /></p>
    )
  })
})


describe('code', () => {

  it('highlights fenced code block', () => {
    expect( render('```js\nconsole.log("Hello, world!")\n```') ).toHtmlEqual(
      <pre>
        <code class="language-js">
          <span class="hljs-built_in">console</span>.log(<span class="hljs-string">"Hello, world!"</span>)
        </code>
      </pre>
    )
  })
})


function render (text: string) {
  return parseHtml(markdownRenderer(markedOpts, katexOpts)(text), { pre: true }).childNodes[0]
}
