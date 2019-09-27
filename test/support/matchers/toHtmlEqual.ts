import { matcherHint, printDiffOrStringify } from 'jest-matcher-utils'
import { HTMLElement } from 'nodom'

type MatcherResult = jest.CustomMatcherResult

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toHtmlEqual (expected: HTMLElement | string): R,
    }
  }
}

export function toHtmlEqual (received: HTMLElement, expected: HTMLElement | string): MatcherResult {
  const receivedStr = received.outerHTML
  const expectedStr = typeof expected === 'string' ? expected : expected.outerHTML

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
