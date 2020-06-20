
const htmlEntities: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
}

type Callable = (...args: any[]) => any

type CallableConstructor = new <T> () => T extends { __call__: Callable }
  ? T['__call__']
  : 'subclass does not implement method __call__'

/* eslint-disable @typescript-eslint/no-unsafe-assignment,
                  @typescript-eslint/no-unsafe-member-access,
                  @typescript-eslint/ban-types */
export const CallableInstance: CallableConstructor = function Callable (
  this: object,
): Callable {

  const func = this.constructor.prototype.__call__ as Callable

  const cls = function (...args: any[]) {
    return func.apply(cls, args) as unknown
  }
  Object.setPrototypeOf(cls, this.constructor.prototype)

  Object.defineProperties(cls, {
    name: {
      value: this.constructor.name,
      configurable: true,
    },
    length: {
      value: func.length,
      configurable: true,
    },
  })
  return cls
} as any
CallableInstance.prototype = Object.create(Function.prototype)
/* eslint-enable @typescript-eslint/no-unsafe-assignment,
                 @typescript-eslint/no-unsafe-member-access,
                 @typescript-eslint/ban-types */

/**
 * Escapes characters with special meaning in HTML with the corresponding
 * HTML entities.
 */
export function escapeHTML (str: string): string {
  return str.replace(/[&<>]/g, c => htmlEntities[c])
}

/**
 * A function that does nothing but return the parameter supplied to it.
 */
export const identity = <T>(x: T, ..._rest: any[]): T => x
