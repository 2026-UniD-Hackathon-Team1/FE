import { Navigate, NavLink, Outlet, useNavigate } from 'react-router'
import { ArrowRightStartOnRectangleIcon, ChevronUpDownIcon, ClockIcon, Cog6ToothIcon, FolderIcon, HomeIcon } from '@heroicons/react/24/outline'
import { useQueryClient } from '@tanstack/react-query'
import { useAgent, useMe, useProject } from '../api/queries'
import { api } from '../api/endpoints'
import { ApiError } from '../api/client'
import { Backdrop, Wordmark } from '../components/Brand'
import { Loading } from '../components/States'
import { Toaster } from '../components/ui/Toast'
import { formatWhen } from '../lib/labels'

const nav = [
  { to: '/', label: '홈', icon: HomeIcon, end: true },
  { to: '/history', label: '이력', icon: ClockIcon },
  { to: '/settings', label: '설정', icon: Cog6ToothIcon },
]

/** 로그인 확인 (D-04: GitHub 로그인). 401이면 로그인 화면으로 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const me = useMe()
  if (me.isPending) return <div className="mx-auto max-w-md pt-32"><Loading /></div>
  if (me.error instanceof ApiError && me.error.status === 401) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AgentStatus() {
  const agent = useAgent()
  const connected = agent.data?.status === 'connected'
  return (
    <div className="grid gap-0.5 border-t border-ink/12 px-2 pt-4 text-caption">
      <span className="flex items-center gap-1.5 font-bold">
        <span aria-hidden className={`size-2 rounded-full ${connected ? 'bg-main' : 'bg-ink-sub'}`} />
        로컬 연결 프로그램
      </span>
      <span className="text-ink-sub">
        {agent.isPending ? '확인 중…' : connected ? `연결됨 · 마지막 확인 ${formatWhen(agent.data?.last_seen_at)}` : '연결 끊김 · 비교와 바꾸기를 할 수 없어요'}
      </span>
    </div>
  )
}

export function AppLayout() {
  const project = useProject()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const logout = async () => {
    await api.logout().catch(() => undefined)
    qc.clear()
    void navigate('/login')
  }

  return (
    <RequireAuth>
      <Backdrop />
      <div className="flex min-h-dvh">
        <aside className="sticky top-0 flex h-dvh w-[248px] shrink-0 flex-col gap-6 border-r border-ink/12 bg-bg-sub px-4 py-6">
          <NavLink to="/" className="px-2">
            <Wordmark />
          </NavLink>

          <label className="grid gap-1 rounded-xl border border-ink/12 bg-white px-3 py-2.5">
            <span className="text-caption text-ink-sub">프로젝트</span>
            <span className="relative flex items-center gap-2 text-aux font-bold">
              <FolderIcon aria-hidden className="size-[18px]" />
              <select className="absolute inset-0 cursor-pointer opacity-0" aria-label="프로젝트 선택" defaultValue="prj_001">
                <option value="prj_001">{project.data?.name ?? 'shop-api'}</option>
              </select>
              <span className="flex-1">{project.data?.name ?? 'shop-api'}</span>
              <ChevronUpDownIcon aria-hidden className="size-4 text-ink-sub" />
            </span>
          </label>

          <nav aria-label="주 메뉴" className="grid gap-1">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `flex h-10 items-center gap-2.5 rounded-lg px-3 text-[15px] transition-colors duration-150 ${
                    isActive ? 'border border-ink/12 bg-white font-bold' : 'text-ink-sub hover:bg-white/60 hover:text-ink'
                  }`
                }
              >
                <n.icon aria-hidden className="size-5" />
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto grid gap-3">
            <AgentStatus />
            <button type="button" onClick={() => void logout()} className="flex items-center gap-1.5 px-2 text-caption text-ink-sub hover:text-ink">
              <ArrowRightStartOnRectangleIcon aria-hidden className="size-4" />
              로그아웃
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-10 py-8">
          <div className="mx-auto max-w-[1112px]">
            <Outlet />
          </div>
        </main>
      </div>
      <Toaster />
    </RequireAuth>
  )
}
