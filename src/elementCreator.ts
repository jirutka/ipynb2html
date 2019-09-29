// NOTE: nodom.HTMLElement defines a subset of properties and functions of
// the browser's HTMLElement, that's why we use it here.
import { HTMLElement } from 'nodom'


type Attributes = { [k: string]: string }

export type ElementCreator =
  & ((tag: string, classes?: string[], children?: HTMLElement[] | string) => HTMLElement)
  & ((tag: string, attrs?: Attributes, children?: HTMLElement[] | string) => HTMLElement)


/**
 * Returns a function for building `HTMLElement`s.
 *
 * @param {function} createElement A function that creates a new `HTMLElement`
 *   (e.g. `document.createElement.bind(document)`).
 * @param {string} classPrefix The prefix to be used for all CSS class names
 *   except `lang-*`. Default is `nb-`.
 */
export default (createElement: (tag: string) => HTMLElement, classPrefix: string = 'nb-'): ElementCreator => {
  const prefixClassName = (name: string) => name.startsWith('lang-') ? name : classPrefix + name

  return (tag: string, classesOrAttrs?: string[] | Attributes, childrenOrHTML?: HTMLElement[] | string) => {
    const el = createElement(tag)

    if (Array.isArray(classesOrAttrs)) {
      el.setAttribute('class', classesOrAttrs.map(prefixClassName).join(' '))

    } else if (classesOrAttrs) {
      for (let [key, val] of Object.entries(classesOrAttrs)) {
        if (key === 'class') {
          val = val.split(' ').map(prefixClassName).join(' ')
        }
        el.setAttribute(key, val)
      }
    }
    if (Array.isArray(childrenOrHTML)) {
      childrenOrHTML.forEach(e => el.appendChild(e))

    } else if (childrenOrHTML) {
      el.innerHTML = childrenOrHTML
    }
    return el
  }
}
