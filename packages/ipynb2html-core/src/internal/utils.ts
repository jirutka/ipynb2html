
const htmlEntities = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
}

type CallableConstructor = new <T> () => T extends { __call__: Function }
  ? T['__call__']
  : 'subclass does not implement method __call__'

export const CallableInstance: CallableConstructor = function Callable (
  this: object,
): Function {

  const func = this.constructor.prototype.__call__ as Function

  const cls = function (...args: any[]) {
    return func.apply(cls, args)
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

/**
 * Escapes characters with special meaning in HTML with the corresponding
 * HTML entities.
 */
export function escapeHTML (str: string): string {
  return str.replace(/[&<>]/g, c => (htmlEntities as any)[c])
}

/**
 * A function that does nothing but return the parameter supplied to it.
 */
export const identity = <T>(x: T, ..._rest: any[]): T => x
