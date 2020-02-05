import { AnyState, Dispatch, Dispatchable, Effect } from 'hyperapp'


function fx <State extends AnyState, Props> (
  fn: (dispatch: Dispatch<State>, props: Props) => void,
) {
  return (props: Props): Effect<State, Props> => [fn, props]
}


type HistoryPush = (props: { state: any, urlQuery?: string }) => Effect<any>

export const historyPush: HistoryPush = fx((_, { state, urlQuery }) => {
  const url = new URL(window.location.href)
  if (urlQuery != null) {
    url.search = urlQuery
  }
  history.pushState(state, document.title, url.href)
})


type ReadFile = <S extends AnyState>(props: {
  file: File,
  onSuccess: Dispatchable<S, string>,
  onError?: Dispatchable<S, DOMException>,
}) => Effect<S>

export const readFile: ReadFile = fx((dispatch, { file, onSuccess, onError }) => {
  const reader = new FileReader()

  reader.onload = (event) => {
    dispatch(onSuccess, event.target?.result?.toString() ?? '')
  }
  if (onError) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    reader.onerror = () => dispatch(onError, reader.error!)
  }
  reader.readAsText(file, 'utf8')
})


type ReadFromStorage = <S extends AnyState, T = unknown>(props: {
  key: string,
  session: boolean,
  onSuccess: Dispatchable<S, T>,
}) => Effect<S>

export const readFromStorage: ReadFromStorage = fx((dispatch, { key, session, onSuccess }) => {
  const storage = session ? window.sessionStorage : window.localStorage

  const value = storage.getItem(key)
  if (value == null) {
    // FIXME
  } else {
    dispatch(onSuccess, JSON.parse(value))
  }
})


type WriteToStorage = (props: {
  key: string,
  value: unknown,
  session: boolean,
}) => Effect<any>

export const writeToStorage: WriteToStorage = fx((_, { key, value, session }) => {
  const storage = session ? window.sessionStorage : window.localStorage

  if (value == null) {
    storage.removeItem(key)
  } else {
    storage.setItem(key, JSON.stringify(value))
  }
})


export class ResponseError extends Error {
  constructor (readonly response: Response) {
    super(`${response.status} ${response.statusText}`)
    // See https://github.com/Microsoft/TypeScript/issues/13965 *facepalm*
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

type Request = <S extends AnyState>(props: {
  url: Parameters<typeof fetch>[0],
  options?: Parameters<typeof fetch>[1],
  onSuccess: Dispatchable<S, unknown>,
  onError: Dispatchable<S, ResponseError | Error>,
}) => Effect<S>

export const request: Request = fx((dispatch, { url, options = {}, onSuccess, onError }) => {
  options.headers = {
    ...options.headers,
    accept: 'application/json',
  }
  fetch(url, options)
    .then(async response => {
      if (!response.ok) {
        throw new ResponseError(response)
      }
      return await response.json() as unknown
    })
    .then(result => dispatch(onSuccess, result))
    .catch(error => dispatch(onError, error))
})


type SetPageTitle = (title: string) => Effect<any>

export const setPageTitle: SetPageTitle = fx((_, title: string) => {
  document.title = title
})
