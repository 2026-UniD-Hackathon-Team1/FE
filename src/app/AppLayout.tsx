import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowRightStartOnRectangleIcon, ChevronUpDownIcon, UserCircleIcon, ClockIcon, Cog6ToothIcon, FolderIcon, HomeIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { useAgent, useHealth, useMe, useProfile, useProject } from '../api/queries'
import { api } from '../api/endpoints'
import { ApiError } from '../api/client'
import { getSession } from '../api/session'
import { Backdrop, Wordmark } from '../components/Brand'
import { ErrorState, Loading } from '../components/States'
import { Toaster } from '../components/ui/Toast'
import { formatWhen } from '../lib/labels'

const nav = [
  { to: '/', label: '홈', icon: HomeIcon, end: true },
  { to: '/discover', label: '후보 둘러보기', icon: SparklesIcon },
  { to: '/history', label: '이력', icon: ClockIcon },
  { to: '/settings', label: '설정', icon: Cog6ToothIcon },
]

/** 프로필이 없으면 온보딩부터 */
function RequireProfile({ children }: { children: React.ReactNode }) {
  const profile = useProfile()
  if (profile.isPending)
    return (
      <div className="mx-auto max-w-md pt-32">
        <Loading />
      </div>
    )
  // 로그인하지 않았거나 세션이 끝났으면 로그인 화면으로
  if (profile.error instanceof ApiError && profile.error.status === 401) return <Navigate to="/login" replace />
  if (profile.isError)
    return (
      <div className="mx-auto max-w-lg px-4 pt-32">
        <ServerDown onRetry={() => void profile.refetch()} />
      </div>
    )
  // 프로필이 없으면: 계정이 있으면 온보딩으로, 처음이면 시작 화면으로
  if (profile.data === null) return <Navigate to={getSession() ? '/onboarding' : '/login'} replace />
  return <>{children}</>
}

/** 갈아탈까 서버에 닿지 않을 때. 모든 데이터가 이 서버에 있어서 화면을 그릴 수 없다 */
export function ServerDown({ onRetry }: { onRetry: () => void }) {
  // 서버 상태(GET /api/health)로 왜 안 되는지 나눠서 알려준다
  const health = useHealth()
  const message = health.isSuccess
    ? '서버는 켜져 있지만 요청을 처리하지 못했어요. 잠시 뒤 다시 시도해 주세요.'
    : health.error instanceof ApiError && health.error.status >= 500
      ? `서버 준비가 덜 됐어요 · ${health.error.message}`
      : '인터넷 연결을 확인하고 잠시 뒤 다시 시도해 주세요.'
  return (
    <ErrorState
      title={health.isSuccess ? '불러오지 못했어요' : '서버에 연결할 수 없어요'}
      message={message}
      onRetry={() => {
        void health.refetch()
        onRetry()
      }}
    />
  )
}

/** 로그인한 계정과 로그아웃 */
function Account() {
  const me = useMe()
  const qc = useQueryClient()
  const navigate = useNavigate()
  if (!me.data || me.data.via !== 'account') return null
  const logout = async () => {
    await api.logout()
    qc.clear()
    void navigate('/login', { replace: true })
  }
  return (
    <div className="flex items-center gap-2.5 border-t border-ink/12 p-3">
      <UserCircleIcon aria-hidden className="size-6 text-ink-sub" />
      <span className="min-w-0 flex-1 truncate text-aux font-bold">{me.data.username}</span>
      <button type="button" onClick={() => void logout()} className="flex items-center gap-1 text-caption text-ink-sub hover:text-ink">
        <ArrowRightStartOnRectangleIcon aria-hidden className="size-4" />
        로그아웃
      </button>
    </div>
  )
}

function AgentStatus() {
  const agent = useAgent()
  const connected = agent.data?.status === 'connected'
  return (
    <div className="grid gap-1 border-t border-ink/12 p-3 text-aux">
      <span className="flex items-center gap-2 text-body font-bold">
        <span aria-hidden className={`size-2 rounded-full ${connected ? 'bg-main' : 'bg-ink-sub'}`} />
        연결 프로그램
      </span>
      <span className="text-ink-sub">
        {agent.isPending
          ? '확인 중…'
          : connected
            ? `${agent.data?.device_name ?? '내 컴퓨터'} · ${formatWhen(agent.data?.last_seen_at)} 확인`
            : agent.data?.status === 'never_connected'
              ? '아직 연결하지 않았어요'
              : `연결 끊김 · 마지막 확인 ${formatWhen(agent.data?.last_seen_at)}`}
      </span>
    </div>
  )
}

export function AppLayout() {
  const project = useProject()
  const { pathname } = useLocation()
  /** 변화 상세·비교·교체 화면은 홈에서 들어가는 하위 화면이라 홈을 선택된 메뉴로 둔다 (Figma S-03~S-06) */
  const underHome = !['/history', '/settings', '/discover'].some((p) => pathname.startsWith(p))

  return (
    <RequireProfile>
      <Backdrop />
      <div className="flex min-h-dvh">
        <aside className="sticky top-0 flex h-dvh w-[248px] shrink-0 flex-col gap-6 border-r border-ink/12 bg-white px-4 py-6">
          <NavLink to="/" className="px-2">
            <Wordmark />
          </NavLink>

          <label className="grid rounded-lg border border-ink/55 bg-white px-3 py-2.5">
            <span className="text-aux text-ink-sub">프로젝트</span>
            <span className="relative flex items-center gap-2 text-body font-bold">
              <FolderIcon aria-hidden className="size-5" />
              <select className="absolute inset-0 cursor-pointer opacity-0" aria-label="프로젝트 선택" defaultValue="prj_001">
                <option value="prj_001">{project.data?.name ?? 'shop-api'}</option>
              </select>
              <span className="flex-1">{project.data?.name ?? 'shop-api'}</span>
              <ChevronUpDownIcon aria-hidden className="size-[18px] text-ink-sub" />
            </span>
          </label>

          <nav aria-label="주 메뉴" className="grid gap-1">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive: matched }) => {
                  const isActive = n.to === '/' ? underHome : matched
                  return `flex h-11 items-center gap-3 rounded-lg border px-3 text-body transition-colors duration-150 ${
                    isActive ? 'border-ink/55 bg-white font-bold' : 'border-transparent font-medium text-ink-sub hover:bg-bg-sub hover:text-ink'
                  }`
                }}
              >
                <n.icon aria-hidden className="size-[22px]" />
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto">
            <AgentStatus />
            <Account />
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-10 py-8">
          <div className="mx-auto max-w-[1112px]">
            <Outlet />
          </div>
        </main>
      </div>
      <Toaster />
    </RequireProfile>
  )
}
