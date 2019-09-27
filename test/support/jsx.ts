import { Document as NDocument, HTMLElement as NHTMLElement, Node as NNode } from 'nodom'

type Assign<T, K> = Pick<T, Exclude<keyof T, keyof K>> & K

type ElementProperties<T extends HTMLElement> = Assign<Partial<T>, {
  class?: T['className'],
  style?: Partial<T['style']>,
  children?: any,
}>

type AnyProperties = {[key: string]: any}

type CreateElement = typeof createElement

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    type IntrinsicElements = {
      [K in keyof HTMLElementTagNameMap]: ElementProperties<HTMLElementTagNameMap[K]>
    }
    type ElementChildrenAttribute = {
      children: any,
    }
    const createElement: CreateElement
  }
}

const document = new NDocument()

// Mimics React.createElement function.
export function createElement <R extends NHTMLElement> (
  factory: (props: AnyProperties) => R, props: AnyProperties, ...children: any[]
): R

export function createElement <K extends keyof JSX.IntrinsicElements> (
  type: K, props: JSX.IntrinsicElements[K], ...children: any[]
): NHTMLElement

export function createElement (
  type: string | ((props: AnyProperties) => NHTMLElement), props: AnyProperties, ...children: any[]
): NHTMLElement {

  if (typeof type === 'function') {
    return type({ ...props, children })
  }
  const el = document.createElement(type)

  for (const [key, val] of Object.entries(props || {})) {
    if (!val) {
      continue
    } else if (key === 'class' || key === 'className') {
      el.className = String(val)
    } else {
      el.setAttribute(key, String(val))
    }
  }
  for (const child of children) {
    if (!child) {
      continue
    } else if (child instanceof NNode) {
      el.appendChild(child)
    } else if (typeof child === 'object' && '__html' in child) {
      el.innerHTML = child.__html
    } else {
      el.appendChild(document.createTextNode(String(child)))
    }
  }
  return el
}

(global as any).JSX = {
  createElement,
}
