import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  parseQueryState,
  queryStateToRouteQuery,
  type QueryState,
} from '@/query/queryState'

/**
 * Bind queue state to the current route.
 * `state` is parsed from the URL; `patch` replace()s only the query string.
 */
export function useQueryState() {
  const route = useRoute()
  const router = useRouter()

  const state = computed(() => {
    const search = route.fullPath.includes('?')
      ? route.fullPath.slice(route.fullPath.indexOf('?') + 1)
      : ''
    return parseQueryState(search)
  })

  /** Merge a partial update into the current query (filters are merged, not replaced). */
  async function patch(partial: Partial<QueryState>): Promise<void> {
    const current = state.value
    const next: QueryState = {
      ...current,
      ...partial,
      filters: { ...current.filters, ...partial.filters },
    }

    await router.replace({ query: queryStateToRouteQuery(next) })
  }

  return { state, patch }
}
