// S-04 비교 준비: 작업 선택, 외부 전송 범위, 바뀌는 조건, 실행 한도와 예상 비용 (FR-18, 19)
// 실행을 시작하면 /comparisons/:id 로 이동해 진행 상태를 보여준다.
import { useNavigate, useSearchParams } from 'react-router'
import { useStartComparison } from '../api/queries'
import { PageHeader } from '../components/PageHeader'
import { ErrorState } from '../components/States'

export function ComparisonNewPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const start = useStartComparison()

  const candidateId = params.get('candidate') ?? ''
  const matchId = params.get('match') ?? ''

  // TODO: 작업 선택(1~3개), 외부 전송 내용 미리보기와 제외, 대체되는 프롬프트·스킬, 실행 한도·예상 비용
  const onStart = () =>
    start.mutate(
      { candidate_id: candidateId, match_id: matchId, input_ids: ['in_1', 'in_2', 'in_3'], excluded_paths: [] },
      { onSuccess: (c) => void navigate(`/comparisons/${c.id}`, { replace: true }) },
    )

  return (
    <>
      <PageHeader title="비교 준비" description="같은 작업을 기존 방식과 후보 방식으로 각각 실행해요." />
      {start.isError && <ErrorState message={start.error.message} />}
      <button
        type="button"
        onClick={onStart}
        disabled={start.isPending || !candidateId}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {start.isPending ? '시작하는 중…' : '비교 시작'}
      </button>
    </>
  )
}
