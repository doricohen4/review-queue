import type { QueryClient } from '@tanstack/vue-query'
import { itemQueryKey } from '@/query/queryKeys'
import type { Item, ItemTablePage } from '@/types/api'

/** List membership can change (needs_work → pending, new risk). The item payload and the audit do not. */
const listKey = ['items'] as const

function replaceEditedItem(page: ItemTablePage | undefined, item: Item): ItemTablePage | undefined {
  if (page === undefined) {
    return page
  }

  return {
    ...page,
    data: page.data.map((row) => (row.id === item.id ? item : row)),
  }
}

/**
 * The PUT body is the updated item. Seed that into the open panel and the current rows,
 * then refetch the list so a status or risk filter can drop the row. Leave audit and filters alone.
 */
export async function applyAuthorEdit(queryClient: QueryClient, item: Item): Promise<void> {
  queryClient.setQueryData(itemQueryKey(item.id), item)
  queryClient.setQueriesData<ItemTablePage>({ queryKey: listKey }, (page) => replaceEditedItem(page, item))
  await queryClient.invalidateQueries({ queryKey: listKey })
}
