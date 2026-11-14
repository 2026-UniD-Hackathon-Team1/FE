import type { BError } from './backend/types'

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: Record<string, unknown>

  constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

/** 갈아탈까 서버 주소 (Railway). 목 서버를 쓸 때는 비워 둔다 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''
/** 설계서 2.2: 다른 웹페이지가 localhost를 호출하지 못하게 하는 로컬 토큰 (.env의 APP_LOCAL_TOKEN과 같은 값) */
const LOCAL_TOKEN = import.meta.env.VITE_LOCAL_TOKEN ?? ''

export interface RequestInit2 extends Omit<RequestInit, 'body'> {
  body?: unknown
  /** 같은 요청을 두 번 보내도 작업이 하나만 생기게 (설계서 12.2) */
  idempotencyKey?: string
}

export async function request<T>(path: string, init: RequestInit2 = {}): Promise<T> {
  const { body, headers, idempotencyKey, ...rest } = init
  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        ...(LOCAL_TOKEN ? { 'X-Local-Token': LOCAL_TOKEN } : {}),
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'SERVER_UNREACHABLE', '서버에 연결할 수 없어요')
  }

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as BError | null
    throw new ApiError(res.status, data?.error.code ?? 'UNKNOWN', data?.error.message ?? `요청에 실패했어요 (${res.status})`, data?.error.details)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const newIdempotencyKey = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`)
