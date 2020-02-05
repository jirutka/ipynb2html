import { AnyState, Dispatch, Effect } from 'hyperapp'


export function fx <State extends AnyState, Props> (
  fn: (dispatch: Dispatch<State>, props: Props) => void,
) {
  return (props: Props): Effect<State, Props> => [fn, props]
}

export function match <T extends string, U extends {[K in T]: (k: K) => any}> (
  value: T,
  matcher: U,
): U extends {[K in T]: (k: K) => infer R} ? R : never {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return matcher[value](value)
}

export function targetFile (event: Event): File {
  const file = (event.target as HTMLInputElement | null)?.files?.[0]

  if (!file) {
    throw TypeError("Event doesn't contain any file")
  }
  return file
}
