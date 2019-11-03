import sourceMapSupport from 'source-map-support'

import cli from './cli'

// Allow to disable sourcemap when running from pkg bundle.
if (!/^(0|disable|false|no|off)$/i.test(process.env.NODE_SOURCEMAP || '')) {
  sourceMapSupport.install({ environment: 'node' })
}

// If the file is run directly (not required as a module), call CLI.
if (require.main === module) {
  cli(process.argv.slice(2))
}

export default cli
