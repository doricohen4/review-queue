const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export type PanelTab = 'details' | 'history'
export type ModalLayer = 'none' | 'panel' | 'editor'
export type HistoryPanelView = 'loading' | 'error' | 'empty' | 'ready'

export function activeModal(panelOpen: boolean, editorOpen: boolean): ModalLayer {
  if (editorOpen) {
    return 'editor'
  }
  if (panelOpen) {
    return 'panel'
  }
  return 'none'
}

export function layerPaused(layer: Exclude<ModalLayer, 'none'>, active: ModalLayer): boolean {
  return active !== layer
}

export function backgroundInert(active: ModalLayer): boolean {
  return active !== 'none'
}

export function overlayKeydown(
  event: KeyboardEvent,
  options: { paused: boolean; root: HTMLElement | null; onEscape: () => void },
): void {
  if (options.paused) {
    return
  }
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    options.onEscape()
    return
  }
  if (options.root !== null) {
    wrapTabFocus(event, options.root)
  }
}

export function historyPanelView(input: {
  pending: boolean
  error: string | null
  length: number
}): HistoryPanelView {
  if (input.length > 0) {
    return 'ready'
  }
  if (input.error !== null) {
    return 'error'
  }
  if (input.pending) {
    return 'loading'
  }
  return 'empty'
}


export function focusableElements(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((element) => {
    if (element.getAttribute('tabindex') === '-1') {
      return false
    }
    return !element.hasAttribute('disabled')
  })
}

/** Keep Tab inside the drawer. */
export function wrapTabFocus(event: KeyboardEvent, root: HTMLElement): void {
  if (event.key !== 'Tab') {
    return
  }
  const nodes = focusableElements(root)
  const first = nodes[0]
  const last = nodes[nodes.length - 1]
  if (first === undefined || last === undefined) {
    return
  }
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
    return
  }
  if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

export function nextPanelTab(current: PanelTab, key: string): PanelTab {
  if (key !== 'ArrowLeft' && key !== 'ArrowRight' && key !== 'Home' && key !== 'End') {
    return current
  }
  if (key === 'Home') {
    return 'details'
  }
  if (key === 'End') {
    return 'history'
  }
  return current === 'details' ? 'history' : 'details'
}
