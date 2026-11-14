// FR-03 환경 재확인: 저장된 상태와 다르면 바뀐 항목을 보여준다
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import { useRecheckEnvironment } from '../../api/queries'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { formatWhen } from '../../lib/labels'

export function RecheckModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const recheck = useRecheckEnvironment()
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={recheck.data ? (recheck.data.changes.length ? '환경이 바뀌었어요' : '바뀐 것이 없어요') : '환경을 다시 확인할게요'}
      footer={
        recheck.data ? (
          <Button variant="primary" onClick={onClose}>
            확인
          </Button>
        ) : (
          <>
            <Button onClick={onClose}>취소</Button>
            <Button variant="primary" icon={ArrowPathIcon} disabled={recheck.isPending} onClick={() => recheck.mutate()}>
              {recheck.isPending ? '확인하는 중…' : '지금 확인'}
            </Button>
          </>
        )
      }
    >
      {recheck.data ? (
        <div className="grid gap-3">
          <p className="text-ink-sub">{formatWhen(recheck.data.checked_at)}에 다시 확인했어요. 저장된 환경과 다른 항목이에요.</p>
          <ul className="rows">
            {recheck.data.changes.map((c) => (
              <li key={c.label} className="flex items-center gap-3 py-2.5">
                <span className="w-36 text-aux text-ink-sub">{c.label}</span>
                <span>{c.before}</span>
                <span aria-hidden className="text-ink-sub">→</span>
                <b>{c.after}</b>
              </li>
            ))}
          </ul>
          <p className="text-aux text-ink-sub">바뀐 내용은 다음 매칭부터 반영해요. 변화 목록이 달라질 수 있어요.</p>
        </div>
      ) : (
        <p className="text-ink-sub">로컬 연결 프로그램이 설치된 도구, 모델, 스킬을 다시 읽어요. 저장된 상태와 다르면 바뀐 항목을 보여 드려요.</p>
      )}
    </Modal>
  )
}
