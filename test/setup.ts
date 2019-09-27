import 'jest'
import 'jest-chain'

import * as matchers from './support/matchers'
import './support/jsx'

expect.extend(matchers)
