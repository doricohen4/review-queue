import { describe, expect, it } from 'vitest'
import { fetchAudit, fetchItem, resubmitItem, saveAuthorCopy, submitItem, updateItem } from './items'

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

describe('fetchAudit', () => {
  it('GETs /api/items/:id/audit and returns review notes', async () => {
    const fetcher: typeof fetch = async (input) => {
      expect(String(input)).toBe('/api/items/12/audit?per_page=50')
      return new Response(
        JSON.stringify({
          data: [
            {
              id: 1,
              decision: 'needs_work',
              risk: 'medium',
              note: 'Add safety warnings.',
              reviewer: { id: 2, name: 'Bob Smith' },
              created_at: '2026-11-24T10:00:00+00:00',
            },
          ],
          meta: { total: 1, current_page: 1, last_page: 1, per_page: 50 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    await expect(fetchAudit(12, fetcher)).resolves.toMatchObject([
      { decision: 'needs_work', note: 'Add safety warnings.' },
    ])
  })
})

describe('updateItem', () => {
  it('PUTs the edited copy for a pending item', async () => {
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe('/api/items/12')
      expect(init?.method).toBe('PUT')
      expect(JSON.parse(String(init?.body))).toEqual({
        title: 'Quiz v2',
        description: 'Fractions with a worked example.',
        submitter_name: 'Alice Johnson',
      })

      return new Response(
        JSON.stringify({
          data: {
            id: 12,
            title: 'Quiz v2',
            description: 'Fractions with a worked example.',
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
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    await expect(
      updateItem(
        12,
        {
          title: 'Quiz v2',
          description: 'Fractions with a worked example.',
          submitter_name: 'Alice Johnson',
        },
        fetcher,
      ),
    ).resolves.toMatchObject({ id: 12, status: 'pending', title: 'Quiz v2' })
  })
})

describe('saveAuthorCopy', () => {
  it('PUTs pending copy and POSTs needs_work resubmit', async () => {
    const methods: string[] = []
    const fetcher: typeof fetch = async (input, init) => {
      methods.push(`${init?.method} ${String(input)}`)
      return new Response(
        JSON.stringify({
          data: {
            id: 12,
            title: 'Quiz v2',
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

    const pending = {
      id: 12,
      title: 'Quiz',
      description: 'Fractions',
      status: 'pending' as const,
      risk: null,
      risk_score: 8,
      flags: [],
      confidence: 'low' as const,
      suggested_decision: null,
      latest_comment: null,
      created_at: null,
      updated_at: null,
    }
    const body = {
      title: 'Quiz v2',
      description: 'Fractions',
      submitter_name: 'Alice Johnson',
    }

    await saveAuthorCopy(pending, body, fetcher)
    await saveAuthorCopy({ ...pending, status: 'needs_work' }, body, fetcher)

    expect(methods).toEqual(['PUT /api/items/12', 'POST /api/items/12/resubmit'])
  })
})

describe('resubmitItem', () => {
  it('POSTs /api/items/:id/resubmit', async () => {
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe('/api/items/12/resubmit')
      expect(init?.method).toBe('POST')
      return new Response(
        JSON.stringify({
          data: {
            id: 12,
            title: 'Quiz v2',
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

    await expect(
      resubmitItem(
        12,
        {
          title: 'Quiz v2',
          description: 'Fractions',
          submitter_name: 'Alice Johnson',
        },
        fetcher,
      ),
    ).resolves.toMatchObject({ id: 12, status: 'pending' })
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
