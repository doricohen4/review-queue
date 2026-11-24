import { describe, expect, it } from 'vitest'
import { fetchHealth } from './health'

describe('fetchHealth', () => {
  it('parses a healthy payload', async () => {
    const fetcher: typeof fetch = async () =>
      new Response(JSON.stringify({ status: 'ok', service: 'review-queue' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

    await expect(fetchHealth(fetcher)).resolves.toEqual({
      status: 'ok',
      service: 'review-queue',
    })
  })

  it('throws when the API is down', async () => {
    const fetcher: typeof fetch = async () => new Response('nope', { status: 500 })

    await expect(fetchHealth(fetcher)).rejects.toThrow('Request failed: 500')
  })
})
