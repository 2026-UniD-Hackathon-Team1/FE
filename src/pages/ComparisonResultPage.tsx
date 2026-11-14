// S-04 진행 상태 + S-05 비교 결과 (FR-20~27). 핵심 시연 화면.
import { useNavigate, useParams } from 'react-router'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import { isTerminal, useComparison, useRerunComparison } from '../api/queries'
import { PageHeader } from '../components/PageHeader'
import { ErrorState, Loading } from '../components/States'
import { Button } from '../components/ui/Button'
import { ResultView } from '../features/comparison/ResultView'
import { RunningView } from '../features/comparison/RunningView'

export function ComparisonResultPage() {
  const { comparisonId = '' } = useParams()
  const q = useComparison(comparisonId)
  const rerun = useRerunComparison()
  const navigate = useNavigate()

  // 결과 로딩 (Figma 38:709): 머리말은 먼저 보여 주고 본문 자리에 로딩 카드
  if (q.isPending)
    return (
      <>
        <PageHeader crumbs={[{ label: '홈', to: '/' }, { label: '비교 결과' }]} title="비교 결과" />
        <Loading text="비교 결과를 불러오는 중이에요" note="진행 중에는 버튼을 잠가 중복 실행을 막아요" />
      </>
    )
  if (q.isError) return <ErrorState message={q.error.message} onRetry={() => void q.refetch()} />

  const c = q.data
  if (!isTerminal(c.status)) return <RunningView c={c} />

  // 양쪽 실행 실패 (5.6장): 에러 화면, 원인 한 줄, 다시 시도, 입력 확인
  if (c.status === 'failed' && c.results.every((r) => r.run_status !== 'success')) {
    return (
      <>
        <PageHeader
          crumbs={[{ label: '홈', to: '/' }, ...(c.change ? [{ label: c.change.title, to: `/changes/${c.change.id}` }] : []), { label: '비교 실행' }]}
          title="비교를 마치지 못했어요"
          description="두 방식 모두 실행에 실패해서 결과를 만들 수 없어요. 원인을 확인하고 다시 시도해 주세요."
        />
        <ErrorState
          title="두 방식 모두 실행하지 못했어요"
          message={c.results[0]?.failure_reason ?? '확인 불가'}
          onRetry={() => rerun.mutate(c.id, { onSuccess: (n) => void navigate(`/comparisons/${n.id}`) })}
          extra={
            <Button onClick={() => void navigate(`/comparisons/new?candidate=${c.candidate_id}&match=${c.match_id}`)}>
              입력 확인
            </Button>
          }
        />
      </>
    )
  }

  return (
    <>
      {c.status === 'cancelled' && (
        <div role="status" className="glass-sub mb-4 flex items-center gap-3 px-5 py-3 text-aux">
          <span className="flex-1">비교를 중간에 멈췄어요. 끝난 결과만 보여 드려요. 판정은 "판단 보류"예요.</span>
          <Button size="sm" icon={ArrowPathIcon} onClick={() => rerun.mutate(c.id, { onSuccess: (n) => void navigate(`/comparisons/${n.id}`) })}>
            다시 실행
          </Button>
        </div>
      )}
      <ResultView c={c} />
    </>
  )
}
