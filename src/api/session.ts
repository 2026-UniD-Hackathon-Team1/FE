// 로그인 세션 토큰 보관. 회원가입·로그인 응답으로 받는다.
const KEY = 'galtalka:session'

export const BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? ''

/** 실제로 요청을 보낼 주소. 개발 서버(npm run dev)에서는 vite가 /api를 BASE_URL로 넘겨 주므로(vite.config.ts)
 *  같은 주소로 보낸다 → 백엔드 CORS 허용 목록에 localhost가 없어도 된다 */
export const REQUEST_ORIGIN: string = import.meta.env.DEV ? '' : BASE_URL

export function getSession(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function setSession(token: string) {
  try {
    localStorage.setItem(KEY, token)
  } catch {
    /* 저장이 막힌 브라우저: 이번 탭에서만 로그인이 유지되지 않을 수 있다 */
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* 무시 */
  }
}

/** 실제 서버에 붙어 있을 때만 로그인을 쓴다. 목 서버(주소 없음)에서는 바로 온보딩으로 간다 */
export const loginEnabled = !!BASE_URL
