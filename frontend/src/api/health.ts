export type HealthResponse = {
  status: string
  service: string
}

export async function fetchHealth(fetcher: typeof fetch = fetch): Promise<HealthResponse> {
  const response = await fetcher('/api/health')

  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status}`)
  }

  return (await response.json()) as HealthResponse
}
