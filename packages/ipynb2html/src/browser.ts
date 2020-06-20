import { createRenderer, NbRendererOpts, Notebook } from '.'

export * from '.'


function unescapeHTML (input: string): string {
  return new DOMParser()
    .parseFromString(input, 'text/html')
    .documentElement
    .textContent ?? ''
}

/**
 * Renders the given Jupyter *notebook* to HTML. It's a shorthand for
 * `createRenderer(document, opts)(notebook)`.
 *
 * @example
 *   document.body.appendChild(ipynb2html.render(notebook))
 *
 * @param notebook Object in Jupyter Notebook Format 4.0+.
 * @param opts The renderer options.
 * @return An HTMLElement with the rendered *notebook*.
 * @see createRenderer
 */
export function render (notebook: Notebook, opts: NbRendererOpts = {}): HTMLElement {
  return createRenderer(document, opts)(notebook)
}

/**
 * Renders Jupyter Notebook inside each
 * `<script type="application/x-ipynb+json">...</script>` found in
 * the page's body.
 *
 * @param opts The renderer options.
 */
export function autoRender (opts: NbRendererOpts = {}): void {
  const selector = 'script[type="application/x-ipynb+json"]'
  const render = createRenderer(document, opts)

  document.querySelectorAll(selector).forEach(script => {
    if (script.textContent && script.parentElement) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const notebook = JSON.parse(unescapeHTML(script.textContent))
      const nbElement = render(notebook)
      script.parentElement.replaceChild(nbElement, script)
    }
  })
}
