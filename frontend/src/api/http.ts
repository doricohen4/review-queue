/** Non-OK HTTP response. Callers branch on `status` (404 vs 422) without parsing the message. */
export class ApiError extends Error {
  readonly status: number
  readonly body: string

  constructor(status: number, body: string) {
    super(`Request failed: ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

/** GET. `TResponse` is the parsed envelope (Item show, list page, health). */
export async function getResponse<TResponse>(
  url: string,
  init: RequestInit = {},
  fetcher: typeof fetch = fetch,
): Promise<TResponse> {
  const response = await fetcher(url, init)

  if (!response.ok) {
    throw new ApiError(response.status, await response.text())
  }

  return (await response.json()) as TResponse
}

/** POST. `TRequest` is the body; `TResponse` is the envelope. */
export async function postRequest<TRequest, TResponse>(
  url: string,
  body: TRequest,
  fetcher: typeof fetch = fetch,
): Promise<TResponse> {
  const response = await fetcher(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new ApiError(response.status, await response.text())
  }

  return (await response.json()) as TResponse
}
