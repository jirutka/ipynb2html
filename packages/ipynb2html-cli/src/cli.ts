import fs from 'fs'
import minimist from 'minimist'
import minimistOptions from 'minimist-options'
import { Document } from 'nodom'
import { exit } from 'process'
import { $INLINE_JSON } from 'ts-transformer-inline-file'

import * as ipynb2html from 'ipynb2html'

import template from './template'


const { version, bugs: bugsUrl } = $INLINE_JSON('../package.json')
const progName = 'ipynb2html'

const helpMsg = `\
Usage: ${progName} [options] <input> [<output>]

Convert Jupyter Notebook 4.0+ to a static HTML page.

Arguments:
  <input>          Path of the Jupyter notebook to read, or "-" for STDIN.
  <output>         Path of the file to write the output HTML into. If not
                   provided, the output will be written to STDOUT.

Options:
  -d --debug       Print debug messages.
  -h --help        Show this message and exit.
  -V --version     Print version and exit.

Exit Codes:
  1                Generic error code.
  2                Missing required arguments or invalid option.

Please report bugs at <${bugsUrl}>.
`

function logErr (msg: string): void {
  console.error(`${progName}: ${msg}`)
}

function parseCliArgs (argv: string[]) {
  const opts = minimist(argv, minimistOptions({
    debug: { alias: 'd', type: 'boolean' },
    version: { alias: 'V', type: 'boolean' },
    help: { alias: 'h', type: 'boolean' },
    arguments: 'string',
    stopEarly: true,
    unknown: (arg: string) => {
      if (arg.startsWith('-')) {
        logErr(`Unknown option: ${arg}`)
        return exit(2)
      } else {
        return true
      }
    },
  }))

  if (opts.help) {
    console.log(helpMsg)
    return exit(0)
  }
  if (opts.version) {
    console.log(`${progName} ${version}`)
    return exit(0)
  }

  if (opts._.length < 1 || opts._.length > 2) {
    logErr('Invalid number of arguments\n')
    console.log(helpMsg)
    return exit(2)
  }
  const [input, output] = opts._

  return {
    debug: opts.debug as boolean,
    input: input === '-' ? 0 : input,  // 0 = stdin
    output,
  }
}

export default (argv: string[]): void => {
  const opts = parseCliArgs(argv)

  try {
    const notebook = JSON.parse(fs.readFileSync(opts.input, 'utf-8'))

    const title = ipynb2html.readNotebookTitle(notebook) || 'Notebook'

    const render = ipynb2html.createRenderer(new Document())
    const contents = render(notebook).outerHTML

    const html = template(contents, title)

    if (opts.output) {
      fs.writeFileSync(opts.output, html)
    } else {
      console.log(html)
    }
  } catch (err) {
    if (opts.debug) {
      console.debug(err)
    } else {
      logErr(err.message)
    }
    return exit(1)
  }
}
