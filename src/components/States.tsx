import type { ReactNode } from 'react'
import { ArrowPathIcon, CheckCircleIcon, ExclamationCircleIcon, LockClosedIcon } from '@heroicons/react/24/outline'
import { Button } from './ui/Button'

// 6.4 화면 상태: 로딩 / 빈 상태 / 에러 / 권한 필요. 모든 화면이 같은 네 가지 표현을 쓴다.

function StateCard({ icon, title, children, actions }: { icon: ReactNode; title: ReactNode; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="glass flex flex-col items-center px-6 py-[72px] text-center">
      <div className="mb-3 text-ink">{icon}</div>
      <p className="text-title3">{title}</p>
      {children && <div className="mt-1.5 max-w-md text-aux text-ink-sub">{children}</div>}
      {actions && <div className="mt-5 flex flex-wrap justify-center gap-2">{actions}</div>}
    </div>
  )
}

/** 진행 중임을 보여주고, 실행 중엔 버튼을 잠가 중복 실행을 막는다 */
export function Loading({ text = '불러오는 중이에요', note }: { text?: string; note?: string }) {
  return (
    <div role="status" aria-live="polite">
      <StateCard icon={<span className="block size-6 animate-spin rounded-full border-2 border-ink/20 border-t-ink" />} title={text}>
        <span className="mx-auto mt-2 grid w-64 gap-2" aria-hidden>
          <span className="h-2.5 animate-shimmer rounded-full bg-ink/12" />
          <span className="h-2.5 w-3/4 animate-shimmer rounded-full bg-ink/12" />
        </span>
        {note && <span className="mt-3 block">{note}</span>}
      </StateCard>
    </div>
  )
}

/** 에러처럼 보이지 않게 중립적인 톤으로 */
export function EmptyState({ title, description, action }: { title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <StateCard icon={<CheckCircleIcon className="size-8" />} title={title} actions={action}>
      {description}
    </StateCard>
  )
}

/** 원인 한 줄 + 다음 행동 */
export function ErrorState({ title = '불러오지 못했어요', message, onRetry, extra }: { title?: string; message: string; onRetry?: () => void; extra?: ReactNode }) {
  return (
    <div role="alert">
      <StateCard
        icon={<ExclamationCircleIcon className="size-8" />}
        title={title}
        actions={
          <>
            {onRetry && (
              <Button variant="primary" icon={ArrowPathIcon} onClick={onRetry}>
                다시 시도
              </Button>
            )}
            {extra}
          </>
        }
      >
        원인: {message}
      </StateCard>
    </div>
  )
}

/** 필요한 권한과 이유를 먼저 설명한다 */
export function PermissionState({ title, reason, action }: { title: string; reason: ReactNode; action: ReactNode }) {
  return (
    <StateCard icon={<LockClosedIcon className="size-8" />} title={title} actions={action}>
      {reason}
    </StateCard>
  )
}
