// S-02 홈: 내 환경 요약, 우선순위 높은 변화 카드, 전체 변화 목록 (FR-03, 09~12)
import { Link } from 'react-router'
import { useChanges, useEnvironment } from '../api/queries'
import { PageHeader } from '../components/PageHeader'
import { EmptyState, ErrorState, Loading } from '../components/States'
import { Badge } from '../components/Badge'
import { impactLabel, natureLabel } from '../lib/labels'

/** [제안] 홈 상단 카드 최대 개수 (D-07) */
const TOP_CARD_LIMIT = 3

export function HomePage() {
  const env = useEnvironment()
  const changes = useChanges()

  return (
    <>
      <PageHeader title="홈" />

      <section className="mb-8 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-600">내 환경</h2>
        {env.isPending ? (
          <Loading />
        ) : env.isError ? (
          <ErrorState message={env.error.message} onRetry={() => void env.refetch()} />
        ) : (
          // TODO: EnvironmentSummary 컴포넌트로 분리
          <p className="text-sm">
            {env.data.tool.name} · {env.data.model.name} · 스킬 {env.data.skills.length}개
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-600">내 환경에 영향을 주는 변화</h2>
        {changes.isPending ? (
          <Loading />
        ) : changes.isError ? (
          <ErrorState message={changes.error.message} onRetry={() => void changes.refetch()} />
        ) : changes.data.length === 0 ? (
          <EmptyState
            title="지금은 내 환경에 영향을 주는 변화가 없어요"
            description={`마지막 확인: ${env.data ? new Date(env.data.last_checked_at).toLocaleString('ko-KR') : '-'}`}
          />
        ) : (
          // TODO: features/changes/ChangeCard 로 교체 (6.2장 6개 요소)
          <ul className="grid gap-3">
            {changes.data.slice(0, TOP_CARD_LIMIT).map(({ match, change }) => (
              <li key={match.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="mb-1 flex gap-1.5">
                  <Badge tone={match.nature === 'action_required' ? 'warning' : 'info'}>{natureLabel[match.nature]}</Badge>
                  <Badge>{impactLabel[match.impact]}</Badge>
                </div>
                <Link to={`/changes/${change.id}`} className="font-medium hover:underline">
                  {change.title}
                </Link>
                <p className="text-sm text-slate-600">{match.reason}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
