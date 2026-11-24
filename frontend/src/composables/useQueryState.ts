import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  parseQueryState,
  queryStateToRouteQuery,
  serializeQueryState,
  type QueryState,
} from '@/query/queryState'

export { parseQueryState, serializeQueryState, type QueryState }

/** List URL is the view: q, filter[], sort, page, panel. */
export function useQueryState() {
  const route = useRoute()
  const router = useRouter()

  const state = computed(() => {
    const search = route.fullPath.includes('?')
      ? route.fullPath.slice(route.fullPath.indexOf('?') + 1)
      : ''
    return parseQueryState(search)
  })

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
