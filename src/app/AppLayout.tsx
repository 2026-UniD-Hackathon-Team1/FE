import { Navigate, NavLink, Outlet, useLocation } from 'react-router'
import { ChevronUpDownIcon, ClockIcon, Cog6ToothIcon, FolderIcon, HomeIcon } from '@heroicons/react/24/outline'
import { useAgent, useProfile, useProject } from '../api/queries'
import { Backdrop, Wordmark } from '../components/Brand'
import { ErrorState, Loading } from '../components/States'
import { Toaster } from '../components/ui/Toast'
import { formatWhen } from '../lib/labels'

const nav = [
  { to: '/', label: '홈', icon: HomeIcon, end: true },
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
  if (profile.isError)
    return (
      <div className="mx-auto max-w-lg px-4 pt-32">
        <ServerDown onRetry={() => void profile.refetch()} />
      </div>
    )
  if (profile.data === null) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

/** 갈아탈까 서버에 닿지 않을 때. 모든 데이터가 이 서버에 있어서 화면을 그릴 수 없다 */
export function ServerDown({ onRetry }: { onRetry: () => void }) {
  return <ErrorState title="서버에 연결할 수 없어요" message="인터넷 연결을 확인하고 잠시 뒤 다시 시도해 주세요." onRetry={onRetry} />
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
              : '꺼져 있음 · 비교와 바꾸기를 할 수 없어요'}
      </span>
    </div>
  )
}

export function AppLayout() {
  const project = useProject()
  const { pathname } = useLocation()
  /** 변화 상세·비교·교체 화면은 홈에서 들어가는 하위 화면이라 홈을 선택된 메뉴로 둔다 (Figma S-03~S-06) */
  const underHome = !pathname.startsWith('/history') && !pathname.startsWith('/settings')

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
