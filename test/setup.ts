// TODO: How to correctly load this file implicitly?
//   setupFilesAfterEnv does not work with TS well.

import * as matchers from './support/matchers'

expect.extend(matchers)
