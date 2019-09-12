import { Document } from 'nodom'

import buildElementCreator from './elementCreator'
import buildRenderer, { Options as RendererOpts, NbRenderer } from './renderer'


export { NbRenderer }

export type Options = Partial<RendererOpts> & {
  classPrefix?: string,
}

export default (opts: Options = {}): NbRenderer => {
  const doc = new Document()
  const elementCreator = buildElementCreator(doc.createElement.bind(doc), opts.classPrefix)

  return buildRenderer({ elementCreator, ...opts })
}
