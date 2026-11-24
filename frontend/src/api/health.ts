import { getJson } from './http'

export type HealthResponse = {
  status: string
  service: string
}

/** GET /api/health — used by the scaffold smoke test. */
export function fetchHealth(fetcher: typeof fetch = fetch): Promise<HealthResponse> {
  return getJson<HealthResponse>('/api/health', {}, fetcher)
}
