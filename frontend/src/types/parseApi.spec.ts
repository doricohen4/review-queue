import { describe, expect, it } from 'vitest'
import itemJson from '../../../contracts/item-resource.json'
import { parseFilterCatalog, parseItem, parsePaginated, parseReview } from './parseApi'

describe('parseItem', () => {
  it('accepts an ItemResource payload', () => {
    expect(parseItem(itemJson)).toMatchObject({
      id: 12,
      status: 'pending',
      risk: 'low',
      submitter: { name: 'Alice Johnson' },
      updated_at: '2026-11-24T12:00:00+00:00',
    })
  })

  it('rejects a payload that does not match the backend item', () => {
    expect(() => parseItem({ ...itemJson, risk: 'none' })).toThrow(/risk/)
    expect(() => parseItem({ title: 'Quiz' })).toThrow(/id/)
  })

  it('still renders leftover rows whose status is not in the demo state machine', () => {
    expect(parseItem({ ...itemJson, status: 'in_review' }).status).toBe('in_review')
  })

  it('keeps a leftover review note and treats a missing note as none', () => {
    expect(
      parseItem({
        ...itemJson,
        latest_comment: { note: 'Cite the diagram.', reviewer_name: 'Bob Smith' },
      }).latest_comment,
    ).toEqual({ note: 'Cite the diagram.', reviewer_name: 'Bob Smith' })
    expect(parseItem(itemJson).latest_comment).toBeNull()
  })

  it('fills missing heuristic fields so older list rows still render', () => {
    const {
      risk_score: _score,
      flags: _flags,
      confidence: _c,
      suggested_decision: _s,
      ...row
    } = itemJson
    expect(parseItem({ ...row, risk: null })).toMatchObject({
      id: 12,
      risk_score: 0,
      flags: [],
      confidence: null,
    })
  })
})

describe('parseReview', () => {
  it('reads a ReviewResource audit row', () => {
    expect(
      parseReview({
        id: 1,
        decision: 'needs_work',
        risk: 'medium',
        note: 'Add safety warnings.',
        reviewer: { id: 2, name: 'Bob Smith' },
        created_at: '2026-11-24T10:00:00+00:00',
      }),
    ).toMatchObject({ note: 'Add safety warnings.', decision: 'needs_work' })
  })
})

describe('parseFilterCatalog', () => {
  it('reads the ItemQuery { data } catalog', () => {
    const catalog = parseFilterCatalog({
      data: {
        status: [{ value: 'pending', label: 'Pending' }],
        risk: [{ value: 'low', label: 'Low' }],
        sort: [{ value: '-created_at', label: 'Newest' }],
        submitter: [{ value: '1', label: 'Alice Johnson' }],
      },
    })
    expect(catalog.status[0]?.value).toBe('pending')
    expect(catalog.submitter[0]?.label).toBe('Alice Johnson')
  })

  it('maps a legacy { filters } payload onto the same catalog', () => {
    const catalog = parseFilterCatalog({
      filters: [
        { key: 'status', options: [{ value: 'pending', label: 'Pending' }] },
        { key: 'risk', options: [{ value: 'low', label: 'Low' }] },
      ],
      sorts: [{ key: '-created_at', label: 'Newest first' }],
    })
    expect(catalog.status).toHaveLength(1)
    expect(catalog.sort[0]?.value).toBe('-created_at')
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
