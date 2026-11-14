// S-02 숨긴 변화 팝업 (Figma 34:2392). 홈과 설정(데이터 관리)에서 연다.
import { useHiddenChanges, useUnhide } from '../../api/queries'
import { Loading } from '../../components/States'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { toast } from '../../components/ui/toastStore'

export function HiddenModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const hidden = useHiddenChanges(open)
  const unhide = useUnhide()
  return (
    <Modal open={open} onClose={onClose} title={`숨긴 변화 ${hidden.data?.length ?? ''}건`} footer={<Button onClick={onClose}>닫기</Button>}>
      {hidden.isPending ? (
        <Loading />
      ) : (
        <ul className="rows">
          {hidden.data?.map(({ match, change }) => (
            <li key={match.id} className="flex items-center gap-3 py-3">
              <div className="flex-1">
                <p className="font-bold">{change.title}</p>
                <p className="text-aux text-ink-sub">{match.reason}</p>
              </div>
              <Button
                disabled={unhide.isPending}
                onClick={() =>
                  unhide.mutate(match.id, {
                    onSuccess: () => void hidden.refetch().then(() => toast('다시 보이게 했어요')),
                  })
                }
              >
                다시 보기
              </Button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-aux text-ink-sub">같은 버전과 작업 유형 조합만 숨겨요. 새 버전이 나오면 다시 알려드려요.</p>
    </Modal>
  )
}
