import { computed, onMounted, ref, watch } from 'vue'
import { fetchFilterCatalog, fetchItem, fetchItems } from '@/api/items'
import { useQueryState } from '@/composables/useQueryState'
import type { FilterCatalog, Item, Paginated } from '@/types/api'

/**
 * Queue page data: list URL drives GET /api/items; `item=` drives GET /api/items/{id}.
 */
export function useQueue() {
  const { state, patch } = useQueryState()

  const page = ref<Paginated<Item> | null>(null)
  const catalog = ref<FilterCatalog | null>(null)
  const catalogError = ref<string | null>(null)
  const error = ref<string | null>(null)
  const searchDraft = ref('')
  const openItem = ref<Item | null>(null)
  const openError = ref<string | null>(null)

  const statusOptions = computed(() => catalog.value?.status ?? [])
  const selectedStatus = computed(() => state.value.filters.status ?? '')
  const openId = computed(() => state.value.item)

  /** Reload the table from q / filter / sort / page. Does not fetch the open row. */
  async function loadItems(): Promise<void> {
    try {
      error.value = null
      page.value = await fetchItems(state.value)
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : 'Could not load the queue'
    }
  }

  /**
   * Load the side panel from GET /api/items/{id}.
   * Missing or invalid `item` clears the panel; 404 lands in openError.
   */
  async function loadOpenItem(): Promise<void> {
    if (openId.value === null) {
      openItem.value = null
      openError.value = null
      return
    }

    const id = Number(openId.value)
    if (!Number.isFinite(id) || id < 1) {
      openItem.value = null
      openError.value = 'Invalid item id'
      return
    }

    try {
      openError.value = null
      openItem.value = await fetchItem(id)
    } catch (caught) {
      openItem.value = null
      openError.value = caught instanceof Error ? caught.message : 'Could not load this item'
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
    await loadOpenItem()
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

  watch(openId, () => {
    void loadOpenItem()
  })

  /** Search box is local until submit so typing does not hit the API on every key. */
  function applySearch(): void {
    void patch({ q: searchDraft.value, page: 1 })
  }

  function setStatus(value: string): void {
    void patch({ filters: { ...state.value.filters, status: value }, page: 1 })
  }

  function openPanel(item: Item): void {
    void patch({ item: String(item.id) })
  }

  function closePanel(): void {
    void patch({ item: null })
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
    page,
    catalogError,
    error,
    searchDraft,
    statusOptions,
    selectedStatus,
    openId,
    openItem,
    openError,
    applySearch,
    setStatus,
    openPanel,
    closePanel,
    goToPage,
  }
}
