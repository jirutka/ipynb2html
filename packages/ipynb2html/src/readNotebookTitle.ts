import marked from 'marked'

import { Notebook } from 'ipynb2html-core'


class EmptyRenderer extends marked.Renderer {}

// Override all the EmptyRenderer's methods inherited from marked.Renderer to
// always return an empty string.
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
const RendererProto = marked.Renderer.prototype
for (const prop of Object.getOwnPropertyNames(RendererProto)) {
  if (prop !== 'constructor' && typeof (RendererProto as any)[prop] === 'function') {
    (EmptyRenderer.prototype as any)[prop] = () => ''
  }
}
/* eslint-enable @typescript-eslint/no-unsafe-member-access */

class MainTitleRenderer extends EmptyRenderer {
  _titleFound = false

  heading (_text: string, level: number, raw: string, _slugger: marked.Slugger): string {
    if (level === 1 && !this._titleFound) {
      this._titleFound = true
      return raw
    }
    return ''
  }
}

/**
 * Returns title of the given *notebook*, or an empty string if not found.
 *
 * If the title is not present in the notebook's metadata and the first cell is
 * a Markdown cell, it parses it and returns the first level 1 heading.
 */
export default (notebook: Notebook): string => {
  if (notebook.metadata.title) {
    return notebook.metadata.title
  }
  if (notebook.cells.length > 0 && notebook.cells[0].cell_type === 'markdown') {
    const source = notebook.cells[0].source
    const markup = Array.isArray(source) ? source.join('') : source

    return marked.parse(markup, { renderer: new MainTitleRenderer() })
  }
  return ''
}
