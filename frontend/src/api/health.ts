import { getJson } from './http'

export type HealthResponse = {
  status: string
  service: string
}

export function fetchHealth(fetcher: typeof fetch = fetch): Promise<HealthResponse> {
  return getJson<HealthResponse>('/api/health', {}, fetcher)
}
