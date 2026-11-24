import { describe, expect, it } from 'vitest'
import { useUi } from './useUi'

describe('useUi', () => {
  it('opens a create modal and an edit modal for an existing item', () => {
    const ui = useUi()
    ui.closeEditor()
    ui.setPanelMounted(false)

    ui.openSubmit()
    expect(ui.editor.value).toEqual({ mode: 'create', item: null })
    expect(ui.activeModal.value).toBe('editor')

    ui.closeEditor()
    expect(ui.editor.value).toBeNull()
    expect(ui.activeModal.value).toBe('none')

    ui.setPanelMounted(true)
    expect(ui.activeModal.value).toBe('panel')

    const item = { id: 4, title: 'Science experiment safety guide' }
    ui.openEdit(item as never)
    expect(ui.editor.value).toEqual({ mode: 'edit', item })
    expect(ui.activeModal.value).toBe('editor')

    ui.closeEditor()
    expect(ui.activeModal.value).toBe('panel')
  })
})

