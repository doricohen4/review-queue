import { computed, onMounted, ref, watch } from 'vue'
import { fetchFilterCatalog, fetchItems } from '@/api/items'
import { useQueryState } from '@/composables/useQueryState'
import type { FilterCatalog, Item, Paginated } from '@/types/api'

export function useQueue() {
  const { state, patch } = useQueryState()

  const page = ref<Paginated<Item> | null>(null)
  const catalog = ref<FilterCatalog | null>(null)
  const catalogError = ref<string | null>(null)
  const error = ref<string | null>(null)
  const searchDraft = ref('')

  const statusOptions = computed(() => catalog.value?.status ?? [])
  const selectedStatus = computed(() => state.value.filters.status ?? '')
  const openId = computed(() => state.value.panel)
  const openItem = computed(() => {
    if (openId.value === null || page.value === null) {
      return null
    }
    const id = Number(openId.value)
    return page.value.data.find((row) => row.id === id) ?? null
  })

  async function loadItems(): Promise<void> {
    try {
      error.value = null
      page.value = await fetchItems(state.value)
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : 'Could not load the queue'
    }
  }

  onMounted(async () => {
    searchDraft.value = state.value.q
    try {
      catalog.value = await fetchFilterCatalog()
      catalogError.value = null
    } catch (caught) {
      catalog.value = null
      catalogError.value = caught instanceof Error ? caught.message : 'Could not load filters'
    }
    await loadItems()
  })

  watch(
    () => [
      state.value.q,
      state.value.filters.status,
      state.value.sort,
      state.value.page,
      state.value.perPage,
    ],
    () => {
      void loadItems()
    },
  )

  function applySearch(): void {
    void patch({ q: searchDraft.value, page: 1 })
  }

  function setStatus(value: string): void {
    void patch({ filters: { ...state.value.filters, status: value }, page: 1 })
  }

  function openPanel(item: Item): void {
    void patch({ panel: String(item.id) })
  }

  function closePanel(): void {
    void patch({ panel: null })
  }

  function goToPage(next: number): void {
    if (page.value === null) {
      return
    }
    const last = page.value.meta.last_page
    const clamped = Math.min(Math.max(1, next), last)
    void patch({ page: clamped })
  }

  return {
    state,
    page,
    catalogError,
    error,
    searchDraft,
    statusOptions,
    selectedStatus,
    openId,
    openItem,
    applySearch,
    setStatus,
    openPanel,
    closePanel,
    goToPage,
  }
}
