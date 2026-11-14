// S-07 이력: 한 줄 기록 타임라인, 필터, 상세 보기, 되돌리기 (FR-32~34)
import { useHistory } from '../api/queries'
import { PageHeader } from '../components/PageHeader'
import { EmptyState, ErrorState, Loading } from '../components/States'
import { actionLabel } from '../lib/labels'

export function HistoryPage() {
  const q = useHistory()

  return (
    <>
      <PageHeader title="이력" description="변화 발견부터 비교, 결정, 교체, 되돌리기까지의 기록이에요." />
      {/* TODO: 필터(프로젝트, 작업 유형, 행동), 교체 건에 [이전 방식으로 되돌리기] */}
      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <ErrorState message={q.error.message} onRetry={() => void q.refetch()} />
      ) : q.data.length === 0 ? (
        <EmptyState title="아직 기록이 없어요" />
      ) : (
        <ol className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {q.data.map((log) => (
            <li key={log.id} className="flex gap-3 px-4 py-3 text-sm">
              <time className="shrink-0 text-slate-500">{new Date(log.at).toLocaleString('ko-KR')}</time>
              <span className="font-medium">{log.change_title}</span>
              <span>{actionLabel[log.action]}</span>
              {log.reason && <span className="text-slate-500">· {log.reason}</span>}
            </li>
          ))}
        </ol>
      )}
    </>
  )
}
