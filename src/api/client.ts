import type { BError } from './backend/types'
import { REQUEST_ORIGIN, clearSession, getSession } from './session'

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

/** 개발용 공용 토큰. 로그인 세션이 없을 때만 쓴다. 배포하는 FE에는 넣지 않는다 (화면 코드에 그대로 노출됨) */
const LOCAL_TOKEN = import.meta.env.VITE_LOCAL_TOKEN ?? ''

export interface RequestInit2 extends Omit<RequestInit, 'body'> {
  body?: unknown
  /** 같은 요청을 두 번 보내도 작업이 하나만 생기게 (설계서 12.2) */
  idempotencyKey?: string
  /** 서버 운영 요청(후보 수집 관리): 로그인과 별개로 운영 토큰을 같이 보낸다 */
  operator?: boolean
}

/** 후보 수집 관리 화면을 쓸 수 있는지: 운영 토큰이 있는 개발 환경이거나 목 서버 */
export const operatorEnabled = !!LOCAL_TOKEN || (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK !== 'false')

/** 요청에 붙일 인증 수단이 있는지 (세션 또는 개발용 공용 토큰) */
export const hasAuth = () => !!getSession() || !!LOCAL_TOKEN

/** 로그인 세션이 있으면 그걸, 없으면 개발용 공용 토큰을 보낸다 */
function authHeader(): Record<string, string> {
  const session = getSession()
  if (session) return { Authorization: `Bearer ${session}` }
  return LOCAL_TOKEN ? { 'X-Local-Token': LOCAL_TOKEN } : {}
}

export async function request<T>(path: string, init: RequestInit2 = {}): Promise<T> {
  const { body, headers, idempotencyKey, operator, ...rest } = init
  let res: Response
  try {
    res = await fetch(`${REQUEST_ORIGIN}${path}`, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        ...authHeader(),
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
        // 운영 API는 로그인 세션만으로는 거절된다 (403 operator_required)
        ...(operator && LOCAL_TOKEN ? { 'X-Local-Token': LOCAL_TOKEN } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'SERVER_UNREACHABLE', '서버에 연결할 수 없어요')
  }

  if (!res.ok) {
    // 로그인 세션이 만료되거나 끊기면 로그인 화면으로 보낸다
    if (res.status === 401 && getSession()) {
      clearSession()
      if (location.pathname !== '/login') location.assign('/login')
    }
    const data = (await res.json().catch(() => null)) as BError | null
    // 서버가 오류에 덧붙인 값(예: 시간 초과 시 job_id)도 details로 넘긴다
    const { code, message, details, ...extra } = data?.error ?? ({} as Partial<BError['error']>)
    throw new ApiError(res.status, code ?? 'UNKNOWN', message ?? `요청에 실패했어요 (${res.status})`, details ?? (Object.keys(extra).length ? extra : undefined))
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const newIdempotencyKey = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`)
