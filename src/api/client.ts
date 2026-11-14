import type { ApiErrorBody } from '../types/api'

export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export async function request<T>(
  path: string,
  init: Omit<RequestInit, 'body'> & { body?: unknown } = {},
): Promise<T> {
  const { body, headers, ...rest } = init
  const res = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as ApiErrorBody | null
    throw new ApiError(
      res.status,
      data?.error.code ?? 'UNKNOWN',
      data?.error.message ?? `요청에 실패했어요 (${res.status})`,
    )
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}
