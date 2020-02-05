import { createOnCustomEvent } from '@hyperapp/events'


export const onDragOver = createOnCustomEvent<DragEvent>('dragover')
export const onDragLeave = createOnCustomEvent<DragEvent>('dragleave')
export const onDrop = createOnCustomEvent<DragEvent>('drop')
export const onPopState = createOnCustomEvent<PopStateEvent>('popstate')
