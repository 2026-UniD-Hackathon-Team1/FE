// S-03 변화 상세: 변경 요약, 내 환경과의 관계, 출처·권한·호환성 (FR-05, 14~16)
import { Link, useParams } from 'react-router'
import { useChange } from '../api/queries'
import { PageHeader } from '../components/PageHeader'
import { ErrorState, Loading } from '../components/States'

export function ChangeDetailPage() {
  const { changeId = '' } = useParams()
  const q = useChange(changeId)

  if (q.isPending) return <Loading />
  if (q.isError) return <ErrorState message={q.error.message} onRetry={() => void q.refetch()} />

  const { change, match, candidates } = q.data
  const comparable = candidates.find((c) => c.support_level !== 'info_only' && c.status === 'active')

  return (
    <>
      <PageHeader title={change.title} description={change.summary} />
      <p className="mb-4 text-sm text-slate-600">{match.reason}</p>

      {/* TODO: 출처 목록, features/comparison/SafetyPanel 재사용 (출처·권한·호환성) */}

      {comparable ? (
        <Link
          to={`/comparisons/new?candidate=${comparable.id}&match=${match.id}`}
          className="inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          내 작업으로 비교하기
        </Link>
      ) : (
        <p className="text-sm text-slate-500">이 변화는 정보 조회만 지원해요.</p>
      )}
    </>
  )
}
