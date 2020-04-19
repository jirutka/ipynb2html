import fs from 'fs'
import minimist from 'minimist'
import minimistOptions from 'minimist-options'
import { Document } from 'nodom'
import { exit } from 'process'
import { $INLINE_FILE, $INLINE_JSON } from 'ts-transformer-inline-file'

import * as ipynb2html from 'ipynb2html'

import renderPage from './page'


const { version, bugs: bugsUrl } = $INLINE_JSON('../package.json')
const notebookCss = $INLINE_FILE('../../ipynb2html/styles/notebook.css')
const pageCss = $INLINE_FILE('./page.css')
const progName = 'ipynb2html'

const helpMsg = `\
Usage: ${progName} [options] <input> [<output>]

Convert Jupyter Notebook 4.0+ to a static HTML page.

Arguments:
  <input>          Path of the Jupyter notebook to read, or "-" for STDIN.
  <output>         Path of the file to write the output HTML into. If not
                   provided, the output will be written to STDOUT.

Options:
  -d --debug             Print debug messages.

  -s --style <file,...>  Comma separated stylesheet(s) to embed into the output
                         HTML. The stylesheet may be a path to a CSS file,
                         "@base" for the base ipynb2html style, or "@default"
                         for the default full page style. Default is @default.

  -h --help              Show this message and exit.

  -V --version           Print version and exit.

Exit Codes:
  1                      Generic error code.
  2                      Missing required arguments or invalid option.

Please report bugs at <${bugsUrl}>.
`

function logErr (msg: string): void {
  console.error(`${progName}: ${msg}`)
}

function arrify <T> (obj: T | T[]): T[] {
  return Array.isArray(obj) ? obj : [obj]
}

function parseCliArgs (argv: string[]) {
  const opts = minimist(argv, minimistOptions({
    debug: { alias: 'd', type: 'boolean' },
    style: { alias: 's', type: 'string', default: '@default' },
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
    styles: arrify(opts.style).join(',').split(/,\s*/),
    debug: opts.debug as boolean,
    input: input === '-' ? 0 : input,  // 0 = stdin
    output,
  }
}

function loadStyle (name: string): string {
  switch (name) {
    case '@base': return notebookCss
    case '@default': return pageCss + notebookCss
    default: return fs.readFileSync(name, 'utf8')
  }
}

export default (argv: string[]): void => {
  const opts = parseCliArgs(argv)

  try {
    const notebook = JSON.parse(fs.readFileSync(opts.input, 'utf-8'))
    const style = opts.styles.map(loadStyle).join('\n')

    const title = ipynb2html.readNotebookTitle(notebook) ?? 'Notebook'

    const renderNotebook = ipynb2html.createRenderer(new Document())
    const contents = renderNotebook(notebook).outerHTML

    const html = renderPage({ contents, title, style })

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
