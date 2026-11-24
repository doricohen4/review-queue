import { computed, onMounted, ref, watch } from 'vue'
import { fetchAudit, fetchFilterCatalog, fetchItem, fetchItems, reviewItems } from '@/api/items'
import { usePersona } from '@/composables/usePersona'
import { useQueryState } from '@/composables/useQueryState'
import { useToast } from '@/composables/useToast'
import { applyOptimisticReview, reconcileReviewResult } from '@/review/optimistic'
import { toggleSortKey, type SortColumn } from '@/query/queryState'
import { createSearchCommit, SEARCH_DEBOUNCE_MS, type SearchCommit } from '@/query/searchInput'
import type { FilterCatalog, Item, ItemPanelData, ItemTablePage, Review } from '@/types/api'

/** Module-level so every `useQueue()` call (table, panel, bulk bar) shares one queue. */
const page = ref<ItemTablePage | null>(null)
const catalog = ref<FilterCatalog | null>(null)
const catalogError = ref<string | null>(null)
const error = ref<string | null>(null)
const searchDraft = ref('')
const openItem = ref<ItemPanelData | null>(null)
const openError = ref<string | null>(null)
const reviewError = ref<string | null>(null)
const reviewPending = ref(false)
const skeleton = ref(true)
const updating = ref(false)
const selectedIds = ref<number[]>([])
const bulkNote = ref('')
const audit = ref<Review[]>([])
const focusReview = ref(false)

let bootstrapped = false
let watching = false
let searchCommit: SearchCommit | null = null
let syncingSearchDraft = false

export function useQueue() {
  const { state, patch } = useQueryState()
  const { currentName } = usePersona()
  const toast = useToast()

  const statusOptions = computed(() => catalog.value?.status ?? [])
  const riskOptions = computed(() => catalog.value?.risk ?? [])
  const sortOptions = computed(() => catalog.value?.sort ?? [])
  const submitterOptions = computed(() => catalog.value?.submitter ?? [])
  const selectedStatus = computed(() => state.value.filters.status ?? '')
  const selectedRisk = computed(() => state.value.filters.risk ?? '')
  const selectedSubmitter = computed(() => state.value.filters.submitter ?? '')
  const selectedCreatedAfter = computed(() => state.value.filters.created_after ?? '')
  const selectedCreatedBefore = computed(() => state.value.filters.created_before ?? '')
  const selectedSort = computed(() => state.value.sort)
  const openId = computed(() => state.value.item)
  const selectedCount = computed(() => selectedIds.value.length)
  const pageIds = computed(() => page.value?.data.map((item) => item.id) ?? [])
  const pageAllSelected = computed(
    () => pageIds.value.length > 0 && pageIds.value.every((id) => selectedIds.value.includes(id)),
  )

  async function loadItems(): Promise<void> {
    updating.value = !skeleton.value
    try {
      error.value = null
      page.value = await fetchItems(state.value)
    } catch (caught) {
      console.error('Failed to load the queue', caught)
      error.value = caught instanceof Error ? caught.message : 'Could not load the queue'
    } finally {
      skeleton.value = false
      updating.value = false
    }
  }

  async function loadOpenItem(): Promise<void> {
    if (openId.value === null) {
      openItem.value = null
      openError.value = null
      audit.value = []
      focusReview.value = false
      return
    }

    const id = Number(openId.value)
    if (!Number.isFinite(id) || id < 1) {
      openItem.value = null
      openError.value = 'Invalid item id'
      audit.value = []
      return
    }

    try {
      openError.value = null
      openItem.value = await fetchItem(id)
      try {
        audit.value = await fetchAudit(id)
      } catch (caught) {
        console.error('Failed to load audit', caught)
        audit.value = []
      }
    } catch (caught) {
      console.error('Failed to load the open item', caught)
      openItem.value = null
      openError.value = caught instanceof Error ? caught.message : 'Could not load this item'
      audit.value = []
    }
  }

  async function refresh(): Promise<void> {
    skeleton.value = true
    await loadItems()
    await loadOpenItem()
  }

  if (!watching) {
    watching = true
    searchCommit = createSearchCommit(SEARCH_DEBOUNCE_MS, (value) => {
      if (value === state.value.q) {
        return
      }
      void patch({ q: value, page: 1 })
    })
    watch(searchDraft, (value) => {
      if (syncingSearchDraft) {
        return
      }
      searchCommit?.push(value)
    })
    watch(
      () => state.value.q,
      (q) => {
        if (q === searchDraft.value) {
          return
        }
        searchCommit?.cancel()
        syncingSearchDraft = true
        searchDraft.value = q
        syncingSearchDraft = false
      },
    )
    watch(
      () => [
        state.value.q,
        state.value.filters.status,
        state.value.filters.risk,
        state.value.filters.submitter,
        state.value.filters.created_after,
        state.value.filters.created_before,
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
  }

  onMounted(() => {
    if (bootstrapped) {
      return
    }
    bootstrapped = true
    searchDraft.value = state.value.q
    void (async () => {
      try {
        catalog.value = await fetchFilterCatalog()
        catalogError.value = null
      } catch (caught) {
        catalog.value = null
        catalogError.value =
          caught instanceof Error ? caught.message : 'Could not load filters'
      }
      await refresh()
    })()
  })

  function applySearch(): void {
    searchCommit?.cancel()
    if (searchDraft.value === state.value.q) {
      return
    }
    void patch({ q: searchDraft.value, page: 1 })
  }

  function setFilter(key: string, value: string): void {
    void patch({ filters: { ...state.value.filters, [key]: value }, page: 1 })
  }

  function setFilters(partial: Record<string, string>): void {
    void patch({ filters: { ...state.value.filters, ...partial }, page: 1 })
  }

  function setSort(value: string): void {
    void patch({ sort: value, page: 1 })
  }

  function toggleColumnSort(column: SortColumn): void {
    setSort(toggleSortKey(state.value.sort, column))
  }

  function setPerPage(value: number): void {
    void patch({ perPage: value, page: 1 })
  }

  function openPanel(item: Item, options?: { review?: boolean }): void {
    focusReview.value = options?.review === true
    void patch({ item: String(item.id) })
  }

  function closePanel(): void {
    void patch({ item: null })
  }

  function onCreated(item: Item): void {
    void patch({ page: 1, item: String(item.id) }).then(async () => {
      await refresh()
    })
  }

  async function onEdited(item: Item): Promise<void> {
    openItem.value = item
    toast.push('Edits saved. Back in the queue.', 'success')
    await loadItems()
    await loadOpenItem()
  }

  function toggleSelected(id: number): void {
    selectedIds.value = selectedIds.value.includes(id)
      ? selectedIds.value.filter((value) => value !== id)
      : [...selectedIds.value, id]
  }

  function togglePage(): void {
    if (pageAllSelected.value) {
      selectedIds.value = selectedIds.value.filter((id) => !pageIds.value.includes(id))
      return
    }
    selectedIds.value = [...new Set([...selectedIds.value, ...pageIds.value])]
  }

  function clearSelection(): void {
    selectedIds.value = []
  }

  async function reviewIds(
    ids: number[],
    payload: { decision: string; note: string | null },
  ): Promise<void> {
    if (ids.length === 0) {
      return
    }

    reviewPending.value = true
    reviewError.value = null
    toast.push(
      ids.length === 1 ? 'Submitting review…' : `Submitting ${ids.length} reviews…`,
      'info',
    )

    const snapshot = page.value
    if (snapshot !== null) {
      const { next, previous } = applyOptimisticReview(snapshot.data, ids, payload.decision)
      page.value = { ...snapshot, data: next }
      if (openItem.value !== null && ids.includes(openItem.value.id)) {
        const updated = next.find((item) => item.id === openItem.value?.id)
        if (updated !== undefined) {
          openItem.value = updated
        }
      }

      try {
        const result = await reviewItems({
          ids,
          decision: payload.decision,
          risk: null,
          note: payload.note,
          reviewer_name: currentName.value,
        })
        const failedIds = result.data.failed.map((row) => row.id)
        page.value = {
          ...page.value,
          data: reconcileReviewResult(page.value.data, previous, failedIds),
        }
        if (result.meta.failed_count === 0) {
          toast.push(
            ids.length === 1
              ? 'Review submitted.'
              : `All ${result.meta.updated_count} reviews submitted.`,
            'success',
          )
          selectedIds.value = selectedIds.value.filter((id) => !ids.includes(id))
        } else {
          const reason = result.data.failed[0]?.reason
          reviewError.value = reason ?? 'Review failed'
          toast.push(
            `${result.meta.updated_count} updated, ${result.meta.failed_count} failed${reason ? `: ${reason}` : '.'}`,
            'error',
          )
        }
        await loadItems()
        await loadOpenItem()
      } catch (caught) {
        page.value = {
          ...page.value,
          data: reconcileReviewResult(page.value.data, previous, ids),
        }
        if (openItem.value !== null && ids.includes(openItem.value.id)) {
          const status = previous.get(openItem.value.id)
          if (status !== undefined) {
            openItem.value = { ...openItem.value, status }
          }
        }
        reviewError.value = caught instanceof Error ? caught.message : 'Could not review'
        toast.push(reviewError.value, 'error')
      } finally {
        reviewPending.value = false
      }
      return
    }

    reviewPending.value = false
  }

  async function reviewOpen(payload: { decision: string; note: string | null }): Promise<void> {
    if (openItem.value === null) {
      return
    }
    await reviewIds([openItem.value.id], payload)
  }

  async function reviewSelected(decision: string): Promise<void> {
    const note = decision === 'needs_work' ? bulkNote.value : bulkNote.value === '' ? null : bulkNote.value
    await reviewIds(selectedIds.value, { decision, note })
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
    skeleton,
    updating,
    statusOptions,
    riskOptions,
    sortOptions,
    submitterOptions,
    selectedStatus,
    selectedRisk,
    selectedSubmitter,
    selectedCreatedAfter,
    selectedCreatedBefore,
    selectedSort,
    openId,
    openItem,
    audit,
    focusReview,
    openError,
    reviewError,
    reviewPending,
    selectedIds,
    selectedCount,
    pageAllSelected,
    bulkNote,
    applySearch,
    setFilter,
    setFilters,
    setSort,
    toggleColumnSort,
    setPerPage,
    refresh,
    openPanel,
    closePanel,
    goToPage,
    onCreated,
    onEdited,
    reviewOpen,
    reviewIds,
    reviewSelected,
    toggleSelected,
    togglePage,
    clearSelection,
  }
}
