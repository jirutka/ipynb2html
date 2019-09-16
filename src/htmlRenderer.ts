import { ElementCreator, HTMLElement } from './elementCreator'
import { DataRenderer } from './renderer'


const extractMathRx = /^\s*<html>\s*<script\s*type="math\/tex(?:;[^"]*)">([\s\S]*)<\/script><\/html>\s*$/

export type Options = {
  elementCreator: ElementCreator,
  mathRenderer: (math: string) => string,
}

/**
 * Returns a text/html data renderer with workaround for SageMath (La)TeX output.
 */
export default ({ elementCreator: el, mathRenderer: renderMath }: Options): DataRenderer => {

  return (data: string): HTMLElement => {
    const math = (data.match(extractMathRx) || [])[1]
    return math
      ? el('div', ['latex-output'], renderMath(math))
      : el('div', ['html-output'], data)
  }
}
