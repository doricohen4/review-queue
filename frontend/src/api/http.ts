/** Laravel `{ message, errors }` or a fallback when the body is not JSON. */
export function messageFromApiBody(status: number, body: string): string {
  try {
    const parsed: unknown = JSON.parse(body)
    if (typeof parsed === 'object' && parsed !== null) {
      const record = parsed as Record<string, unknown>
      if (typeof record.message === 'string' && record.message !== '') {
        return record.message
      }
      if (typeof record.errors === 'object' && record.errors !== null) {
        const first = Object.values(record.errors as Record<string, unknown>)
          .flatMap((value) => (Array.isArray(value) ? value : [value]))
          .find((value) => typeof value === 'string')
        if (typeof first === 'string' && first !== '') {
          return first
        }
      }
    }
  } catch {
    if (body.trim() !== '') {
      return body
    }
  }

  return `Request failed: ${status}`
}

/** Non-OK HTTP response. Callers branch on `status` (404 vs 422) without parsing the message. */
export class ApiError extends Error {
  readonly status: number
  readonly body: string

  constructor(status: number, body: string) {
    super(messageFromApiBody(status, body))
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

/** PUT. Same JSON contract as POST. */
export async function putRequest<TRequest, TResponse>(
  url: string,
  body: TRequest,
  fetcher: typeof fetch = fetch,
): Promise<TResponse> {
  return sendJson<TRequest, TResponse>('PUT', url, body, fetcher)
}

/** POST. `TRequest` is the body; `TResponse` is the envelope. */
export async function postRequest<TRequest, TResponse>(
  url: string,
  body: TRequest,
  fetcher: typeof fetch = fetch,
): Promise<TResponse> {
  return sendJson<TRequest, TResponse>('POST', url, body, fetcher)
}

async function sendJson<TRequest, TResponse>(
  method: 'POST' | 'PUT',
  url: string,
  body: TRequest,
  fetcher: typeof fetch,
): Promise<TResponse> {
  const response = await fetcher(url, {
    method,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new ApiError(response.status, await response.text())
  }

  return (await response.json()) as TResponse
}
