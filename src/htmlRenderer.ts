import { ElementCreator } from './elementCreator'
import { DataRenderer } from './renderer'


const extractMathRx = /^\s*<html>\s*<script\s*type="math\/tex(?:;[^"]*)">([\s\S]*)<\/script><\/html>\s*$/

export type Options<TElement = HTMLElement> = {
  elementCreator: ElementCreator<TElement>,
  mathRenderer: (math: string) => string,
}

/**
 * Returns a text/html data renderer with workaround for SageMath (La)TeX output.
 */
export default <TElement> (opts: Options<TElement>): DataRenderer<TElement> => {
  const { elementCreator: el, mathRenderer: renderMath } = opts

  return (data: string): TElement => {
    const math = (data.match(extractMathRx) || [])[1]
    return math
      ? el('div', ['latex-output'], renderMath(math))
      : el('div', ['html-output'], data)
  }
}
