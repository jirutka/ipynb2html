
type Callable = (...args: any[]) => any

export type Mock<F extends Callable> = jest.Mock<ReturnType<F>, Parameters<F>>

export function asMock <F extends Callable> (fn: F): Mock<F> {
  if (jest.isMockFunction(fn)) {
    return fn
  }
  throw TypeError('not a mocked function')
}

export function mockResults <F extends Callable> (fn: F): Array<ReturnType<F>> {
  return asMock(fn).mock.results
    .filter(x => x.type === 'return')
    .map(x => x.value)
}

export function mockLastResult <F extends Callable> (fn: F): ReturnType<F> {
  return mockResults(fn).pop() as ReturnType<F>
}
