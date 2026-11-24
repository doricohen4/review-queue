import { QueryClient } from '@tanstack/vue-query'
import { describe, expect, it } from 'vitest'
import type { Item, ItemTablePage } from '@/types/api'
import { applyAuthorEdit } from './authorEdit'

const saved = { id: 15, title: 'Art collage instructions11' } as Item

describe('applyAuthorEdit', () => {
  it('keeps the saved item and refetches only the list', async () => {
    const client = new QueryClient()
    const invalidated: unknown[] = []
    const invalidate = client.invalidateQueries.bind(client)
    client.invalidateQueries = (filters) => {
      invalidated.push(filters)
      return invalidate(filters)
    }

    const page: ItemTablePage = {
      data: [
        { id: 15, title: 'Art collage instructions' } as Item,
        { id: 2, title: 'Other' } as Item,
      ],
      meta: { current_page: 1, last_page: 1, per_page: 15, total: 2 },
    }
    client.setQueryData(['items', 'status=needs_work'], page)

    await applyAuthorEdit(client, saved)

    expect(client.getQueryData(['item', 15])).toMatchObject({ title: 'Art collage instructions11' })
    expect(client.getQueryData<ItemTablePage>(['items', 'status=needs_work'])?.data.map((row) => row.title)).toEqual([
      'Art collage instructions11',
      'Other',
    ])
    expect(invalidated).toEqual([{ queryKey: ['items'] }])
  })
})
