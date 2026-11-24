import { computed, onMounted, ref, watch } from 'vue'
import { fetchFilterCatalog, fetchItem, fetchItems, reviewItems } from '@/api/items'
import { usePersona } from '@/composables/usePersona'
import { useQueryState } from '@/composables/useQueryState'
import type { FilterCatalog, Item, ItemPanelData, ItemTablePage } from '@/types/api'

/**
 * Queue page data: list URL drives GET /api/items; `item=` drives GET /api/items/{id}.
 */
export function useQueue() {
  const { state, patch } = useQueryState()
  const { currentName } = usePersona()

  const page = ref<ItemTablePage | null>(null)
  const catalog = ref<FilterCatalog | null>(null)
  const catalogError = ref<string | null>(null)
  const error = ref<string | null>(null)
  const searchDraft = ref('')
  const openItem = ref<ItemPanelData | null>(null)
  const openError = ref<string | null>(null)
  const reviewError = ref<string | null>(null)
  const reviewPending = ref(false)

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

  /** After submit, show the new row: jump to page 1 and open GET /api/items/{id}. */
  function onCreated(item: Item): void {
    void patch({ page: 1, item: String(item.id) }).then(async () => {
      await loadItems()
      await loadOpenItem()
    })
  }

  /** POST /api/items/review as the header persona (Bob reviewing Alice's item). */
  async function reviewOpen(payload: { decision: string; note: string | null }): Promise<void> {
    if (openItem.value === null) {
      return
    }

    reviewPending.value = true
    reviewError.value = null
    try {
      const result = await reviewItems({
        ids: [openItem.value.id],
        decision: payload.decision,
        risk: null,
        note: payload.note,
        reviewer_name: currentName.value,
      })
      if (result.meta.failed_count > 0) {
        reviewError.value = result.data.failed[0]?.reason ?? 'Review failed'
        return
      }
      await loadItems()
      await loadOpenItem()
    } catch (caught) {
      reviewError.value = caught instanceof Error ? caught.message : 'Could not review'
    } finally {
      reviewPending.value = false
    }
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
    reviewError,
    reviewPending,
    applySearch,
    setStatus,
    openPanel,
    closePanel,
    goToPage,
    onCreated,
    reviewOpen,
  }
}
