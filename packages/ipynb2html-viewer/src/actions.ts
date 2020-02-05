/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-use-before-define */
import * as hyperapp from 'hyperapp'
import * as ipynb2html from 'ipynb2html'

import {
  historyPush,
  readFile,
  readFromStorage,
  request,
  ResponseError,
  setPageTitle,
  writeToStorage,
} from './effects'
import { State, ErrorMessage } from './types'


type Action<Payload = void> = hyperapp.Action<State, Payload>
type Dispatchable<DPayload = void, CPayload = any> = hyperapp.Dispatchable<State, DPayload, CPayload>


const initState: State = {
  mainView: 'BLANK',
  fileUrl: null,
  title: '.ipynb viewer',
  notebook: null,
  error: null,
  dragover: false,
  historyIdx: 0,
  fromHistory: false,
}


// Helpers

// FIXME: This is just a quick & dirty solution.
const isNotebook = (notebook: any): notebook is ipynb2html.Notebook => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  return typeof notebook === 'object' && !!notebook?.metadata && !!notebook?.cells
}

const isFileDataTransfer = (transfer: DataTransfer | null): transfer is DataTransfer => {
  return !!transfer && !!Array.from(transfer.items).find(item => item.kind === 'file')
}

const rewriteFileUrl = (url: string): string => {
  const { host, pathname } = new URL(url)

  switch (host) {
    case 'gist.github.com':
      return `https://gist.githubusercontent.com${pathname}/raw/`
    default:
      return url
  }
}

const stateToUrlQuery = (state: State): string => {
  const params: Record<string, string> = {}
  if (state.fileUrl) {
    params.url = state.fileUrl
  }
  return new URLSearchParams(params).toString()
}


// Actions

export const Initialize: hyperapp.ActionOnInit<State> = () => {
  const url = new URLSearchParams(window.location.search).get('url')

  return url
    ? (FetchNotebook({ ...initState, fileUrl: url }) as hyperapp.DispatchableOnInit<State>)
    : initState
}

export const ShowNotebook: Action<unknown> = (state, notebook): Dispatchable => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  notebook = typeof notebook === 'string' ? JSON.parse(notebook) : notebook

  if (!isNotebook(notebook)) {
    return [ShowError, {
      title: 'Invalid Format',
      message: 'The file is not in Jupyter Notebook format.',
    }]
  }
  const title = ipynb2html.readNotebookTitle(notebook) ?? initState.title

  const effects = [
    setPageTitle(title),
  ]
  if (!state.fromHistory) {
    state.historyIdx++

    effects.push(
      writeToStorage({
        key: `notebook/${state.historyIdx}`,
        value: notebook,
        session: true,
      }),
      historyPush({
        state: { ...state, notebook: null },
        urlQuery: stateToUrlQuery(state),
      }),
    )
  }

  return [
    {
      ...state,
      title,
      notebook,
      mainView: 'NOTEBOOK',
      fromHistory: false,
      error: null,
    },
    ...effects,
  ]
}

export const ShowBlank: Action = (state): Dispatchable => [
  (state = { ...state, mainView: 'BLANK', fileUrl: null, notebook: null }),
  setPageTitle(initState.title!),
  historyPush({
    state,
    urlQuery: '',
  }),
]

export const ShowError: Action<Error | ErrorMessage> = (state, error): Dispatchable => {
  let title = 'title' in error ? error.title : 'Error'
  let message = error.message
  let detail = error.message

  if (error instanceof SyntaxError && error.message.startsWith('JSON.parse:')) {
    title = 'Malformed Notebook'
    message = 'The file is not a valid JSON.'
  } else if (error instanceof ResponseError) {
    title = 'HTTP Error'
    message = 'Failed to fetch notebook from the given address.'
  } else if (error instanceof TypeError
      && (error.message === 'Failed to fetch' || error.message.startsWith('NetworkError '))
  ) {
    title = 'Network Error'
    message = 'Failed to fetch notebook from the given address.'
  } else {
    detail = ''
  }
  console.error(error)

  return {
    ...state,
    mainView: 'ERROR',
    error: { title, message, detail },
    notebook: null,
  }
}

export const SubmitFileUrl: Action = (state): Dispatchable => (
  state.fileUrl ? FetchNotebook : ShowBlank
)

export const SetFileUrl: Action<string> = (state, fileUrl): Dispatchable => (
  { ...state, fileUrl }
)

export const FetchNotebook: Action = (state): Dispatchable => [
  { ...state, mainView: 'FETCHING', notebook: null },
  request({
    url: rewriteFileUrl(state.fileUrl!),
    options: {
      mode: 'cors',
      redirect: 'follow',
      referrerPolicy: 'no-referrer',
    },
    onSuccess: ShowNotebook,
    onError: ShowError,
  }),
]

export const LoadLocalFile: Action<File> = (state, file): Dispatchable => [
  { ...state, fileUrl: null },
  readFile({ file, onSuccess: ShowNotebook }),
]

export const HistoryPop: Action<PopStateEvent> = (state, event): Dispatchable => [
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  { ...(state = event.state ?? state), fromHistory: true },
  readFromStorage({
    key: `notebook/${state.historyIdx}`,
    session: true,
    onSuccess: ShowNotebook,
  }),
]

export const DragOver: Action<DragEvent> = (state, event): Dispatchable => {
  if (!isFileDataTransfer(event.dataTransfer)) {
    return state
  }
  event.preventDefault()
  event.dataTransfer.dropEffect = 'copy'

  return { ...state, dragover: true }
}

export const DragLeave: Action = (state): Dispatchable => ({
  ...state,
  dragover: false,
})

export const DropFile: Action<DragEvent> = (state, event): Dispatchable => {
  if (!isFileDataTransfer(event.dataTransfer)) {
    return state
  }
  event.preventDefault()
  const file = event.dataTransfer.files?.[0]

  return [
    { ...state, dragover: false, fileUrl: null },
    readFile({ file, onSuccess: ShowNotebook }),
  ]
}
