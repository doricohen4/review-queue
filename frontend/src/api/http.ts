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

/** Typed JSON GET. Throws ApiError on non-OK so callers do not `as` ad hoc. */
export async function getJson<T>(
  url: string,
  init: RequestInit = {},
  fetcher: typeof fetch = fetch,
): Promise<T> {
  const response = await fetcher(url, init)

  if (!response.ok) {
    throw new ApiError(response.status, await response.text())
  }

  return (await response.json()) as T
}

/** Typed JSON POST with a JSON body. */
export async function postJson<TBody, TRes>(
  url: string,
  body: TBody,
  fetcher: typeof fetch = fetch,
): Promise<TRes> {
  const response = await fetcher(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new ApiError(response.status, await response.text())
  }

  return (await response.json()) as TRes
}
