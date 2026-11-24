import { describe, expect, it } from 'vitest'
import { fetchItem, submitItem } from './items'

describe('fetchItem', () => {
  it('GETs /api/items/:id and unwraps data', async () => {
    const fetcher: typeof fetch = async (input) => {
      expect(String(input)).toBe('/api/items/12')
      return new Response(
        JSON.stringify({
          data: {
            id: 12,
            title: 'Quiz',
            description: 'Fractions',
            status: 'pending',
            risk: null,
            risk_score: 8,
            flags: [],
            confidence: 'low',
            suggested_decision: null,
            created_at: null,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    await expect(fetchItem(12, fetcher)).resolves.toMatchObject({ id: 12, title: 'Quiz' })
  })
})

describe('submitItem', () => {
  it('POSTs submitter_name when creating an item', async () => {
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe('/api/items')
      expect(init?.method).toBe('POST')
      expect(JSON.parse(String(init?.body))).toEqual({
        title: 'Quiz',
        description: 'Fractions',
        submitter_name: 'Alice Johnson',
      })

      return new Response(
        JSON.stringify({
          data: {
            id: 3,
            title: 'Quiz',
            description: 'Fractions',
            status: 'pending',
            risk: null,
            risk_score: 8,
            flags: [],
            confidence: 'low',
            suggested_decision: null,
            submitter: { id: 1, name: 'Alice Johnson' },
            created_at: null,
          },
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      )
    }

    await expect(
      submitItem(
        { title: 'Quiz', description: 'Fractions', submitter_name: 'Alice Johnson' },
        fetcher,
      ),
    ).resolves.toMatchObject({ id: 3, submitter: { name: 'Alice Johnson' } })
  })
})
