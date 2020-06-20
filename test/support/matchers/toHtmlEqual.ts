import { matcherHint, printDiffOrStringify } from 'jest-matcher-utils'
import { HTMLElement } from 'nodom'

type MatcherResult = jest.CustomMatcherResult

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R, T> {
      toHtmlEqual: (expected: HTMLElement | string | Array<HTMLElement | string>) => R,
    }
  }
}

function formatArray (items: unknown[]): string {
  return '[\n' + items.map(x => `  ${x}`).join(',\n') + '\n]'
}

function stringify (obj: HTMLElement | string): string {
  return typeof obj === 'string' ? obj : obj.outerHTML
}

export function toHtmlEqual (
  received: HTMLElement | HTMLElement[],
  expected: HTMLElement | string | Array<HTMLElement | string>,
): MatcherResult {

  const receivedStr = Array.isArray(received)
    ? formatArray(received.map(stringify))
    : stringify(received)

  const expectedStr = Array.isArray(expected)
    ? formatArray(expected.map(stringify))
    : stringify(expected)

  const pass = receivedStr === expectedStr

  const hintOpts = {
    isNot: pass,
    comment: 'equality of .outerHTML',
  }
  const message = () =>
    matcherHint('toHtmlEqual', undefined, undefined, hintOpts)
    + '\n\n'
    + printDiffOrStringify(expectedStr, receivedStr, 'Expected', 'Received', true)

  return { pass, message }
}
