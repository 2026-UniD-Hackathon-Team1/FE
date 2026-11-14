// S-00 로그인 (D-04: GitHub 로그인)
import { useNavigate } from 'react-router'
import { Backdrop, Wordmark } from '../components/Brand'
import { Card } from '../components/ui/Card'

const USE_MOCK = import.meta.env.DEV && import.meta.env.VITE_USE_MOCK !== 'false'
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

const points = [
  ['내 환경에 영향을 주는 변화만', '쓰는 도구·스킬·작업과 관계없는 소식은 보여주지 않아요.'],
  ['내 작업으로 직접 비교', '같은 작업을 기존 방식과 새 방식으로 실행해서 결과를 나란히 보여줘요.'],
  ['언제든 되돌리기', '바꾸기 전에 백업하고, 한 번에 원래대로 돌아갈 수 있어요.'],
] as const

function GitHubMark() {
  return (
    <svg aria-hidden width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  )
}

export function LoginPage() {
  const navigate = useNavigate()

  const login = () => {
    if (USE_MOCK) {
      localStorage.setItem('mock:logged_in', '1')
      void navigate('/onboarding')
      return
    }
    // 백엔드가 GitHub OAuth를 처리하고 세션 쿠키를 붙여 돌려보낸다
    window.location.href = `${BASE_URL}/auth/github`
  }

  return (
    <>
      <Backdrop />
      <header className="px-10 py-5">
        <Wordmark />
      </header>
      <main className="mx-auto max-w-[880px] px-4 pt-10 pb-16">
        <h1 className="text-title1 text-balance">새로 나온 AI 도구, 내 작업에서 정말 나을까요?</h1>
        <p className="mt-2 max-w-2xl text-ink-sub">
          갈아탈까는 내 환경에 영향을 주는 변화만 골라 알려주고, 내 작업으로 직접 비교해 본 뒤 바꿀지 정하게 도와줘요.
        </p>
        <Card className="mt-8 grid gap-6">
          <ul className="grid gap-5">
            {points.map(([t, d]) => (
              <li key={t}>
                <p className="text-title3">{t}</p>
                <p className="text-ink-sub">{d}</p>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={login}
            className="flex h-12 items-center justify-center gap-2.5 rounded-lg bg-ink text-[15px] font-bold text-white transition-colors duration-150 hover:bg-ink/90"
          >
            <GitHubMark />
            GitHub로 계속하기
          </button>
          <p className="text-aux text-ink-sub">코드는 서버에 저장하지 않아요. 비교 기록과 결정만 남겨요.</p>
        </Card>
      </main>
    </>
  )
}
