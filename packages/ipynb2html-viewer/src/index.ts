import { app } from 'hyperapp'
import { preventDefault } from '@hyperapp/events'

import * as actions from './actions'
import { onDragLeave, onDragOver, onDrop, onPopState } from './events'
import { State } from './types'
import { App } from './view'


export default (): void => app<State>({
  node: document.body,
  init: actions.Initialize,
  view: App,
  subscriptions: () => [
    onDragOver(actions.DragOver),
    onDragLeave(preventDefault(actions.DragLeave)),
    onDrop(actions.DropFile),
    onPopState(actions.HistoryPop),
  ],
})
