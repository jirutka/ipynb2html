
const htmlEntities = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
}

/**
 * Creates a "callable object" with the given properties. In fact, it creates
 * a function that calls `obj[funcName]` and copies all the enumerable
 * properties of the *template* to the created function.
 *
 * @param {string} funcName Name of the function property of the *template*.
 * @param {Object} template The source object from which to copy enumerable properties.
 * @return A function with all enumerable properties of the *template*.
 */
export function callableObject <T, K extends keyof T> (
  funcName: K,
  template: T,
): T[K] extends Function ? T & T[K] : never {

  const fn = function (...args: any[]) {
    return (template[funcName] as any)(...args)
  }
  return Object.assign(fn, template) as any
}

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
