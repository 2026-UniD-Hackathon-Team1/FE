import type { ReactNode } from 'react'

// 6.4 화면 상태: 로딩 / 빈 상태 / 에러

export function Loading({ text = '불러오는 중이에요' }: { text?: string }) {
  return (
    <div role="status" className="py-12 text-center text-sm text-slate-500">
      {text}
    </div>
  )
}

/** 에러처럼 보이지 않게 중립적인 톤으로 */
export function EmptyState({ title, description }: { title: string; description?: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-6 py-10 text-center">
      <p className="font-medium text-slate-700">{title}</p>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
    </div>
  )
}

/** 원인 한 줄 + 다음 행동 */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-6 text-center">
      <p className="text-sm text-red-800">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-md bg-white px-3 py-1.5 text-sm font-medium ring-1 ring-red-200 hover:bg-red-100"
        >
          다시 시도
        </button>
      )}
    </div>
  )
}
