import { describe, expect, it } from 'vitest'
import { fetchItem } from './items'

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
