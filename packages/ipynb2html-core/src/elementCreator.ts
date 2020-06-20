type Attributes = { [k: string]: string }

// Definition of the smallest possible subset of the HTMLElement type required
// for this module's function.
export type MinimalElement = {
  innerHTML: string,
  setAttribute: (name: string, value: string) => void,
  appendChild: (child: any) => any,
}

export type ElementCreator<TElement = HTMLElement> =
  & ((tag: string, classes?: string[], children?: TElement[] | string) => TElement)
  & ((tag: string, attrs?: Attributes, children?: TElement[] | string) => TElement)

/**
 * Returns a function for building `HTMLElement`s.
 *
 * @param {function} createElement A function that creates a new `HTMLElement`
 *   (e.g. `document.createElement.bind(document)`).
 * @param {string} classPrefix The prefix to be used for all CSS class names
 *   except `lang-*`. Default is `nb-`.
 * @template TElement Type of the element object that *createElement* produces.
 */
export default <TElement extends MinimalElement> (
  createElement: (tag: string) => TElement,
  classPrefix = 'nb-',
): ElementCreator<TElement> => {

  const prefixClassName = (name: string) => name.startsWith('lang-') ? name : classPrefix + name

  return (tag: string, classesOrAttrs?: string[] | Attributes, childrenOrHTML?: TElement[] | string): TElement => {
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
