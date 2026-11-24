import { describe, expect, it } from 'vitest'
import { useUi } from './useUi'

describe('useUi', () => {
  it('opens a create modal and an edit modal for an existing item', () => {
    const ui = useUi()
    ui.closeEditor()

    ui.openSubmit()
    expect(ui.editor.value).toEqual({ mode: 'create', item: null })

    const item = { id: 4, title: 'Science experiment safety guide' }
    ui.openEdit(item as never)
    expect(ui.editor.value).toEqual({ mode: 'edit', item })

    ui.closeEditor()
    expect(ui.editor.value).toBeNull()
  })
})
