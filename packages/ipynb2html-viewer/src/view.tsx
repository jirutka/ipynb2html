/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-use-before-define */
import { h, Lazy, View } from 'hyperapp'
import { preventDefault, targetValue } from '@hyperapp/events'
import * as ipynb2html from 'ipynb2html'
import { $INLINE_JSON } from 'ts-transformer-inline-file'

import * as actions from './actions'
import { State, ErrorMessage } from './types'
import { match, targetFile } from './utils'


const { homepage } = $INLINE_JSON<{ homepage: string }>('../package.json')
const renderNotebook = ipynb2html.createRenderer(document)

export const App: View<State> = (state) => (
  <body class={{ dragover: state.dragover }}>
    <Header fileUrl={ state.fileUrl } />
    <main>{
      match(state.mainView, {
        ERROR: () => <ErrorBox error={ state.error! } />,
        FETCHING: () => <FetchingSpinner />,
        NOTEBOOK: () => <Lazy view={ Notebook } notebook={ state.notebook } />,
        BLANK: () => null,
      })
    }</main>
  </body>
)

const Header: View<Pick<State, 'fileUrl'>> = ({ fileUrl }) => (
  <header id='header'>
    <a class='logo' href='/'>
      ipynb<sup>viewer</sup>
    </a>
    <label class='file-label' title='Open a notebook'>
      <input
        class='file-input'
        type='file'
        accept='.ipynb, .json, application/x-ipynb+json'
        onchange={ [actions.LoadLocalFile, targetFile] }
      />
    </label>
    <form class='url-form' onSubmit={ preventDefault(actions.SubmitFileUrl) }>
      <input
        class='url-input'
        name='url'
        type='url'
        placeholder='Notebook URL'
        title='URL of ipynb file or Gist with ipynb file to render'
        pattern='https?://.*'
        value={ fileUrl }
        onchange={ [actions.SetFileUrl, targetValue] }
      />
    </form>
    <a class='github-link' href={ homepage } title='Project’s homepage'>
      GitHub
    </a>
  </header>
)

const Notebook: View<Pick<State, 'notebook'>> = ({ notebook }) => (
  <div class='nb-notebook' innerHTML={ renderNotebook(notebook as any).innerHTML } />
)

const ErrorBox: View<{ error: ErrorMessage }> = ({ error }) => (
  <aside class='error' role='alert'>
    <h2>{ error.title }</h2>
    <details>
      <summary>{ error.message }</summary>
      <p>{ error.detail }</p>
    </details>
  </aside>
)

const FetchingSpinner: View<{}> = () => (
  <aside class='fetching' role='alert'>
    <p>Fetching notebook…</p>
  </aside>
)
