import { $INLINE_JSON } from 'ts-transformer-inline-file'

const { version } = $INLINE_JSON('../package.json')

export default version as string
