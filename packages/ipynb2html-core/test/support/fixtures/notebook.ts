import * as nb from '@/nbformat'

const { CellType, OutputType } = nb


export const Stream: nb.StreamOutput = {
  output_type: OutputType.Stream,
  name: 'stdout',
  text: [
    'foo\n',
    'bar',
  ],
}

export const Error: nb.ErrorOutput = {
  output_type: OutputType.Error,
  ename: 'Error',
  evalue: 'whatever',
  traceback: [
    'Error',
    '  at repl:1:7',
    '  at REPLServer.self.eval (repl.js:110:21)',
  ],
}

export const ExecuteResult: nb.ExecuteResult = {
  output_type: OutputType.ExecuteResult,
  data: {
    'text/plain': [
      '[1, 2]\n',
      '[3, 4]',
    ],
  },
  execution_count: 1,
  metadata: {},
}

export const DisplayData: nb.DisplayData = {
  output_type: OutputType.DisplayData,
  data: {
    'application/x-tex': '\\alpha = 42',
    'text/plain': 'α = 42',
  },
  metadata: {},
}

export const CodeCell: nb.CodeCell = {
  cell_type: CellType.Code,
  source: 'print("Hello, world!")',
  execution_count: 1,
  outputs: [
    DisplayData,
    ExecuteResult,
    Stream,
    Error,
  ],
  metadata: {},
}

export const RawCell: nb.RawCell = {
  cell_type: CellType.Raw,
  source: '<p>Allons-y!</p>',
  metadata: {
    format: 'text/html',
  },
}

export const MarkdownCell: nb.MarkdownCell = {
  cell_type: CellType.Markdown,
  source: [
    '# Title\n',
    '\n',
    'Markdown content',
  ],
  metadata: {
    tags: ['test'],
  },
}

export const Notebook: nb.Notebook = {
  metadata: {
    kernelspec: {
      display_name: 'Julia 1.2.0',
      language: 'julia',
      name: 'julia-1.2',
    },
    language_info: {
      file_extension: '.jl',
      mimetype: 'application/julia',
      name: 'julia',
      version: '1.2.0',
    },
  },
  nbformat: 4,
  nbformat_minor: 3,
  cells: [
    RawCell,
    MarkdownCell,
    CodeCell,
  ],
}
