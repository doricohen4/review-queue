import { computed, ref } from 'vue'
import { activeModal as resolveModal, type ModalLayer } from '@/display/sheetA11y'
import type { Item } from '@/types/api'

export type EditorState =
  | null
  | { mode: 'create'; item: null }
  | { mode: 'edit'; item: Item }

const editor = ref<EditorState>(null)
const navOpen = ref(false)
const panelMounted = ref(false)

export function useUi() {
  const activeModal = computed<ModalLayer>(() =>
    resolveModal(panelMounted.value, editor.value !== null),
  )

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

  function setPanelMounted(open: boolean): void {
    panelMounted.value = open
  }

  return {
    editor,
    navOpen,
    activeModal,
    openSubmit,
    openEdit,
    closeEditor,
    setPanelMounted,
  }
}
