import { ref } from 'vue'
import type { Item } from '@/types/api'

export type EditorState =
  | null
  | { mode: 'create'; item: null }
  | { mode: 'edit'; item: Item }

const editor = ref<EditorState>(null)
const navOpen = ref(false)

export function useUi() {
  function openSubmit(): void {
    editor.value = { mode: 'create', item: null }
    navOpen.value = false
  }

  function openEdit(item: Item): void {
    editor.value = { mode: 'edit', item }
    navOpen.value = false
  }

  function closeEditor(): void {
    editor.value = null
  }

  return { editor, navOpen, openSubmit, openEdit, closeEditor }
}
