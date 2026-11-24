import { computed, onScopeDispose, ref, watch } from 'vue'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/vue-query'
import {
  fetchAudit,
  fetchFilterCatalog,
  fetchItem,
  fetchItems,
  reviewItems,
} from '@/api/items'
import { usePersona } from '@/composables/usePersona'
import { useQueryState } from '@/composables/useQueryState'
import { useToast } from '@/composables/useToast'
import { auditQueryKey, filterCatalogQueryKey, itemQueryKey, itemsQueryKey } from '@/query/queryKeys'
import { toQueueFilterView } from '@/query/queueFilterView'
import { toggleSortKey, type SortColumn } from '@/query/queryState'
import { createSearchCommit, SEARCH_DEBOUNCE_MS } from '@/query/searchInput'
import { applyAuthorEdit } from '@/queue/authorEdit'
import { executeReview } from '@/queue/executeReview'
import {
  clearSelection as emptySelection,
  pageAllSelected as pageIdsAllSelected,
  togglePageSelection,
  toggleSelectedId,
} from '@/queue/selection'
import type { Item } from '@/types/api'

function errorMessage(error: unknown, fallback: string): string | null {
  if (error == null) {
    return null
  }
  return error instanceof Error ? error.message : fallback
}

export function useQueue() {
  const { state, patch } = useQueryState()
  const { currentName } = usePersona()
  const toast = useToast()
  const queryClient = useQueryClient()

  const searchDraft = ref(state.value.q)
  const selectedIds = ref<number[]>([])
  const focusReview = ref(false)
  const reviewError = ref<string | null>(null)
  const reviewPending = ref(false)
  let syncingSearchDraft = false

  const listKey = computed(() => itemsQueryKey(state.value))
  const openId = computed(() => state.value.item)
  const openNumericId = computed(() => {
    if (openId.value === null) {
      return null
    }
    const id = Number(openId.value)
    return Number.isFinite(id) && id >= 1 ? id : null
  })

  const catalogQuery = useQuery({
    queryKey: filterCatalogQueryKey,
    queryFn: fetchFilterCatalog,
  })

  const itemsQuery = useQuery({
    queryKey: listKey,
    queryFn: () => fetchItems(state.value),
    placeholderData: keepPreviousData,
  })

  const itemQuery = useQuery({
    queryKey: computed(() => itemQueryKey(openNumericId.value ?? 0)),
    queryFn: () => fetchItem(openNumericId.value as number),
    enabled: computed(() => openNumericId.value !== null),
  })

  const auditQuery = useQuery({
    queryKey: computed(() => auditQueryKey(openNumericId.value ?? 0)),
    queryFn: () => fetchAudit(openNumericId.value as number),
    enabled: computed(() => openNumericId.value !== null),
  })

  const page = computed(() => itemsQuery.data.value ?? null)
  const catalogError = computed(() => errorMessage(catalogQuery.error.value, 'Could not load filters'))
  const error = computed(() => errorMessage(itemsQuery.error.value, 'Could not load the queue'))
  const skeleton = computed(() => itemsQuery.isPending.value && page.value === null)
  const updating = computed(() => itemsQuery.isFetching.value && page.value !== null)
  const openItem = computed(() => (openNumericId.value === null ? null : (itemQuery.data.value ?? null)))
  const audit = computed(() => auditQuery.data.value ?? [])
  const auditPending = computed(() => auditQuery.isPending.value)
  const auditError = computed(() => errorMessage(auditQuery.error.value, 'Could not load history'))
  const openError = computed(() => {
    if (openId.value === null) {
      return null
    }
    if (openNumericId.value === null) {
      return 'Invalid item id'
    }
    return errorMessage(itemQuery.error.value, 'Could not load this item')
  })
  const canRetryOpen = computed(
    () => openNumericId.value !== null && itemQuery.isError.value,
  )

  const filterView = computed(() =>
    toQueueFilterView(state.value.filters, {
      status: catalogQuery.data.value?.status ?? [],
      risk: catalogQuery.data.value?.risk ?? [],
      submitter: catalogQuery.data.value?.submitter ?? [],
    }),
  )
  const selectedSort = computed(() => state.value.sort)
  const selectedCount = computed(() => selectedIds.value.length)
  const pageIds = computed(() => page.value?.data.map((item) => item.id) ?? [])
  const pageAllSelected = computed(() => pageIdsAllSelected(pageIds.value, selectedIds.value))

  const searchCommit = createSearchCommit(SEARCH_DEBOUNCE_MS, (value) => {
    if (value === state.value.q) {
      return
    }
    void patch({ q: value, page: 1 })
  })
  onScopeDispose(() => searchCommit.cancel())

  watch(searchDraft, (value) => {
    if (syncingSearchDraft) {
      return
    }
    searchCommit.push(value)
  })
  watch(
    () => state.value.q,
    (q) => {
      if (q === searchDraft.value) {
        return
      }
      searchCommit.cancel()
      syncingSearchDraft = true
      searchDraft.value = q
      syncingSearchDraft = false
    },
  )

  async function invalidateQueue(): Promise<void> {
    await queryClient.invalidateQueries({ queryKey: ['items'] })
    await queryClient.invalidateQueries({ queryKey: ['item'] })
    await queryClient.invalidateQueries({ queryKey: ['audit'] })
    await queryClient.invalidateQueries({ queryKey: filterCatalogQueryKey })
  }

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

  function retryOpenItem(): void {
    void itemQuery.refetch()
  }

  function retryAudit(): void {
    void auditQuery.refetch()
  }

  function onCreated(item: Item): void {
    void patch({ page: 1, item: String(item.id) }).then(async () => {
      await invalidateQueue()
    })
  }

  async function onEdited(item: Item): Promise<void> {
    toast.push('Edits saved. Back in the queue.', 'success')
    await applyAuthorEdit(queryClient, item)
  }

  function toggleSelected(id: number): void {
    selectedIds.value = toggleSelectedId(selectedIds.value, id)
  }

  function togglePage(): void {
    selectedIds.value = togglePageSelection(selectedIds.value, pageIds.value, pageAllSelected.value)
  }

  function clearSelection(): void {
    selectedIds.value = emptySelection()
  }

  async function reviewIds(
    ids: number[],
    payload: { decision: string; note: string | null },
  ): Promise<void> {
    if (ids.length === 0 || page.value === null) {
      return
    }

    if (payload.decision === 'needs_work' && (payload.note == null || payload.note.trim() === '')) {
      reviewError.value = 'A note is required for needs work.'
      toast.push(reviewError.value, 'error')
      return
    }

    reviewPending.value = true
    reviewError.value = null

    const result = await executeReview({
      items: page.value.data,
      openItem: openItem.value,
      selectedIds: selectedIds.value,
      ids,
      decision: payload.decision,
      note: payload.note,
      reviewerName: currentName.value,
      reviewItems,
    })

    queryClient.setQueryData(listKey.value, {
      ...page.value,
      data: result.items,
    })
    if (result.openItem !== null && openNumericId.value !== null) {
      queryClient.setQueryData(itemQueryKey(openNumericId.value), result.openItem)
    }
    selectedIds.value = result.selectedIds
    if (result.kind !== 'success') {
      reviewError.value = result.error
    }
    toast.push(result.toast.message, result.toast.tone)
    reviewPending.value = false
    await invalidateQueue()
  }

  async function reviewOpen(payload: { decision: string; note: string | null }): Promise<void> {
    if (openItem.value === null) {
      return
    }
    await reviewIds([openItem.value.id], payload)
  }

  async function reviewSelected(decision: string, note: string): Promise<void> {
    const normalized = decision === 'needs_work' ? note : note === '' ? null : note
    await reviewIds(selectedIds.value, { decision, note: normalized })
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
    skeleton,
    updating,
    filterView,
    selectedSort,
    openId,
    openItem,
    audit,
    auditPending,
    auditError,
    focusReview,
    openError,
    canRetryOpen,
    retryOpenItem,
    retryAudit,
    reviewError,
    reviewPending,
    selectedIds,
    selectedCount,
    pageAllSelected,
    applySearch,
    setFilter,
    setFilters,
    setSort,
    toggleColumnSort,
    setPerPage,
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
