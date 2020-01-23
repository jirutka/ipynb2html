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
      toMatchElement (expected: HTMLElement, opts?: Options): R,
    }
  }
}

export const AnythingNode = new class extends Node {
  render () { return '<!--Anything-->' }
}()

export const Anything = () => AnythingNode

function filterWildcardChildren (rec: Node, exp: Node): void {
  if (exp.firstChild === AnythingNode
      && exp.children.length === 1
      && rec instanceof HTMLElement
      && rec.innerHTML
  ) {
    rec.innerHTML = ''
    rec.children.splice(0, rec.children.length, AnythingNode)
    return
  }
  for (let i = 0; i < exp.children.length && i < rec.children.length; i++) {
    if (exp.children[i] === AnythingNode) {
      rec.children[i] = AnythingNode
    } else {
      filterWildcardChildren(exp.children[i], rec.children[i])
    }
  }
}

function clearAttributes (node: Node): void {
  if (node instanceof HTMLElement) {
    node.attributes = {}
    node.className = ''
  }
  node.children.forEach(clearAttributes)
}

export function toMatchElement (received: HTMLElement, expected: HTMLElement, opts?: Options): MatcherResult {
  received = received.cloneNode(true) as HTMLElement

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
