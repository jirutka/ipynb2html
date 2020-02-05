import { Notebook } from 'ipynb2html'

export type State = {
  fileUrl: string | null,
  title: string | null,
  notebook: Notebook | null,
  error: ErrorMessage | null,
  dragover: boolean,
  historyIdx: number,
  fromHistory: boolean,
  mainView: 'BLANK' | 'ERROR' | 'FETCHING' | 'NOTEBOOK',
}

export type ErrorMessage = {
  title: string,
  message: string,
  detail?: string,
}
