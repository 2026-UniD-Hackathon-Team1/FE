// S-06 교체 확인: 변경 미리보기, 추가 권한, 되돌리기 안내 (FR-28~31)
import { Link, useNavigate, useParams } from 'react-router'
import { useStartSwitch } from '../api/queries'
import { PageHeader } from '../components/PageHeader'
import { ErrorState } from '../components/States'

export function SwitchConfirmPage() {
  const { comparisonId = '' } = useParams()
  const navigate = useNavigate()
  const sw = useStartSwitch()

  return (
    <>
      <PageHeader title="교체 확인" description="바꾸기 전에 현재 상태를 백업해요. 언제든 이력에서 되돌릴 수 있어요." />

      {/* TODO: 바뀔 파일·설정값·스킬 버전, 추가 권한, 환경 변경 감지(FR-28) 표시 */}
      {sw.isError && <ErrorState message={sw.error.message} />}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={sw.isPending}
          onClick={() => sw.mutate(comparisonId, { onSuccess: () => void navigate('/history') })}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {sw.isPending ? '백업 후 교체 중…' : '확인하고 바꾸기'}
        </button>
        <Link to={`/comparisons/${comparisonId}`} className="rounded-md px-4 py-2 text-sm ring-1 ring-slate-300">
          취소
        </Link>
      </div>
    </>
  )
}
