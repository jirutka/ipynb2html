import { matcherHint, printDiffOrStringify } from 'jest-matcher-utils'
import { HTMLElement, Node } from 'nodom'

type MatcherResult = jest.CustomMatcherResult

type Options = {
  ignoreAttrs?: boolean,
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R, T> {
      toMatchElement: (expected: HTMLElement, opts?: Options) => R,
    }
  }
}

export const AnythingNode = new class extends Node {
  render () { return '<!--Anything-->' }
  toString () { return this.render() }
}()

export const Anything = (): Node => AnythingNode

function isWritable (obj: any, prop: string): boolean {
  const desc = Object.getOwnPropertyDescriptor(obj, prop)
  // eslint-disable-next-line @typescript-eslint/unbound-method
  return !!desc?.writable || !!desc?.set
}

function filterWildcardChildren (rec: Node, exp: Node): void {
  if (exp.firstChild === AnythingNode
      && exp.childNodes.length === 1
      && (rec as HTMLElement).innerHTML
  ) {
    if (isWritable(rec, 'innerHTML')) {
      (rec as HTMLElement).innerHTML = ''
    }
    rec.childNodes.splice(0, rec.childNodes.length, AnythingNode)
    return
  }
  for (let i = 0; i < exp.childNodes.length && i < rec.childNodes.length; i++) {
    if (exp.childNodes[i] === AnythingNode) {
      rec.childNodes[i] = AnythingNode
    } else {
      filterWildcardChildren(rec.childNodes[i], exp.childNodes[i])
    }
  }
}

function clearAttributes (node: Node): void {
  if (node instanceof HTMLElement) {
    node.attributes = {}
    node.className = ''
  }
  node.childNodes.forEach(clearAttributes)
}

export function toMatchElement (received: HTMLElement, expected: HTMLElement, opts?: Options): MatcherResult {
  if (received.cloneNode) {
    received = received.cloneNode(true) as HTMLElement
  }

  if (opts?.ignoreAttrs) {
    clearAttributes(received)
  }
  filterWildcardChildren(received, expected)

  const receivedStr = received.outerHTML
  const expectedStr = expected.outerHTML
  const expectedLabel = 'expected' + (opts ? ', ' + JSON.stringify(opts) : '')

  const pass = receivedStr === expectedStr

  const message = () =>
    matcherHint('toMatchElement', undefined, expectedLabel, { isNot: pass })
    + '\n\n'
    + printDiffOrStringify(expectedStr, receivedStr, 'Expected', 'Received', true)

  return { pass, message }
}
