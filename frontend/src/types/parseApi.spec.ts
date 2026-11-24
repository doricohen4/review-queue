import { describe, expect, it } from 'vitest'
import itemJson from '../../../contracts/item-resource.json'
import { parseItem, parsePaginated } from './parseApi'

describe('parseItem', () => {
  it('accepts an ItemResource payload', () => {
    expect(parseItem(itemJson)).toMatchObject({
      id: 12,
      status: 'pending',
      risk: 'low',
      submitter: { name: 'Alice Johnson' },
    })
  })

  it('rejects a payload that does not match the backend item', () => {
    expect(() => parseItem({ ...itemJson, status: 'in_review' })).toThrow(/status/)
    expect(() => parseItem({ ...itemJson, risk: 'none' })).toThrow(/risk/)
    expect(() => parseItem({ title: 'Quiz' })).toThrow(/id/)
  })
})

describe('parsePaginated', () => {
  it('reads Laravel list meta and maps each row', () => {
    const page = parsePaginated(
      {
        data: [itemJson],
        meta: { total: 1, current_page: 1, last_page: 1, per_page: 15 },
      },
      parseItem,
    )

    expect(page.meta.total).toBe(1)
    expect(page.data[0]?.title).toBe('Quiz')
  })
})
