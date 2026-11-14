// S-04 진행 상태 + S-05 비교 결과 (FR-20~27). 핵심 시연 화면.
import { Link, useParams } from 'react-router'
import { isTerminal, useComparison } from '../api/queries'
import { PageHeader } from '../components/PageHeader'
import { ErrorState, Loading } from '../components/States'
import { StatusStepper } from '../components/StatusStepper'
import { verdictLabel } from '../lib/labels'

export function ComparisonResultPage() {
  const { comparisonId = '' } = useParams()
  const q = useComparison(comparisonId)

  if (q.isPending) return <Loading />
  if (q.isError) return <ErrorState message={q.error.message} onRetry={() => void q.refetch()} />

  const c = q.data

  if (!isTerminal(c.status)) {
    return (
      <>
        <PageHeader title="비교 실행 중" description={`${c.conditions.baseline_label} → ${c.conditions.candidate_label}`} />
        <StatusStepper status={c.status} />
        {/* TODO: [취소] 버튼 (POST /comparisons/:id/cancel) */}
      </>
    )
  }

  return (
    <>
      {/* ComparisonHeader: 무엇과 무엇을 비교했는지, 작업 수, 실행 횟수 */}
      <PageHeader
        title={`${c.conditions.baseline_label} → ${c.conditions.candidate_label}`}
        description={
          <>
            작업 {c.inputs.length}개 · 각 방식 {c.run_count}회 실행 결과
            {c.is_prerecorded && c.executed_at && ` · 사전 실행 결과 (${new Date(c.executed_at).toLocaleString('ko-KR')})`}
          </>
        }
      />

      {/* VerdictBanner — P1: 어느 쪽이 유리해도 같은 강조 수준 */}
      <section className="mb-6 rounded-lg border border-slate-300 bg-white p-4">
        <p className="font-semibold">{c.verdict ? verdictLabel[c.verdict] : verdictLabel.inconclusive}</p>
        {c.verdict_reason && <p className="mt-1 text-sm text-slate-600">{c.verdict_reason}</p>}
      </section>

      {/* TODO (features/comparison):
          - TaskTabs: 작업별 탭 + 전체 집계
          - MetricTable: 지표 나란히 + EvidenceBadge + Metric
          - MissedItems: 0건이면 "놓친 것 없음" + 대조 한계 안내
          - SideBySideOutput: 원문 나란히 보기
          - FindingList: 검증 상태 수정 (PATCH /findings/:id)
          - SafetyPanel: 출처·권한·추가 권한·호환성 — DecisionBar 바로 위 (AC M4)
          - DecisionBar: [바꿔보기] [기존 방식 유지] [추가 비교] [나중에] [관심 없음] */}

      <div className="flex flex-wrap gap-2">
        <Link
          to={`/comparisons/${c.id}/switch`}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          바꿔보기
        </Link>
      </div>
    </>
  )
}
