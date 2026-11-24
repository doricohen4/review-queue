import { describe, expect, it } from 'vitest'
import { ApiError, getJson } from './http'

describe('getJson', () => {
  it('returns a typed JSON body', async () => {
    const fetcher: typeof fetch = async () =>
      new Response(JSON.stringify({ total: 2 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

    await expect(getJson<{ total: number }>('/api/items', {}, fetcher)).resolves.toEqual({
      total: 2,
    })
  })

  it('throws ApiError when the response is not ok', async () => {
    const fetcher: typeof fetch = async () => new Response('nope', { status: 500 })

    await expect(getJson('/api/items', {}, fetcher)).rejects.toBeInstanceOf(ApiError)
  })
})
