/** Pause before writing `q` so each keystroke does not replace the URL. */
export const SEARCH_DEBOUNCE_MS = 300

export type SearchCommit = {
  push: (value: string) => void
  cancel: () => void
}

export function createSearchCommit(
  delayMs: number,
  commit: (value: string) => void,
): SearchCommit {
  let timer: ReturnType<typeof setTimeout> | undefined

  return {
    push(value: string) {
      if (timer !== undefined) {
        clearTimeout(timer)
      }
      timer = setTimeout(() => {
        timer = undefined
        commit(value)
      }, delayMs)
    },
    cancel() {
      if (timer === undefined) {
        return
      }
      clearTimeout(timer)
      timer = undefined
    },
  }
}
