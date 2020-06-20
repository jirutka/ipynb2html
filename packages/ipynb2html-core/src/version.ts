import { $INLINE_JSON } from 'ts-transformer-inline-file'

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const { version } = $INLINE_JSON('../package.json')

export default version as string
