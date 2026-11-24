import { describe, expect, it, vi } from 'vitest'
import {
  activeModal,
  backgroundInert,
  historyPanelView,
  layerPaused,
  nextPanelTab,
  overlayKeydown,
} from './sheetA11y'

describe('sheetA11y', () => {
  it('moves Details/History with arrows and Home/End', () => {
    expect(nextPanelTab('details', 'ArrowRight')).toBe('history')
    expect(nextPanelTab('history', 'ArrowRight')).toBe('details')
    expect(nextPanelTab('history', 'ArrowLeft')).toBe('details')
    expect(nextPanelTab('details', 'Home')).toBe('details')
    expect(nextPanelTab('history', 'Home')).toBe('details')
    expect(nextPanelTab('details', 'End')).toBe('history')
    expect(nextPanelTab('details', 'Enter')).toBe('details')
  })

  it('treats the editor as the only active modal when both overlays are open', () => {
    expect(activeModal(false, false)).toBe('none')
    expect(activeModal(true, false)).toBe('panel')
    expect(activeModal(true, true)).toBe('editor')
    expect(activeModal(false, true)).toBe('editor')
    expect(layerPaused('panel', 'editor')).toBe(true)
    expect(layerPaused('panel', 'panel')).toBe(false)
    expect(layerPaused('editor', 'editor')).toBe(false)
    expect(backgroundInert('none')).toBe(false)
    expect(backgroundInert('panel')).toBe(true)
    expect(backgroundInert('editor')).toBe(true)
  })

  it('ignores Escape and Tab on a paused overlay', () => {
    const onEscape = vi.fn<() => void>()
    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    overlayKeydown(escape, { paused: true, root: null, onEscape })
    expect(onEscape).not.toHaveBeenCalled()
    expect(escape.defaultPrevented).toBe(false)

    overlayKeydown(escape, { paused: false, root: null, onEscape })
    expect(onEscape).toHaveBeenCalledOnce()
    expect(escape.defaultPrevented).toBe(true)
  })

  it('does not call an empty history “no changes” while the timeline is loading or failed', () => {
    expect(historyPanelView({ pending: true, error: null, length: 0 })).toBe('loading')
    expect(historyPanelView({ pending: false, error: 'Could not load history', length: 0 })).toBe(
      'error',
    )
    expect(historyPanelView({ pending: false, error: null, length: 0 })).toBe('empty')
    expect(historyPanelView({ pending: false, error: null, length: 2 })).toBe('ready')
    expect(historyPanelView({ pending: true, error: null, length: 2 })).toBe('ready')
  })
})
