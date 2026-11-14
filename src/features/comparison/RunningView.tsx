// S-04 비교 실행 중 (FR-20~21): 진행 상태, 작업별 상태, 실행 취소
import { useEffect, useState } from 'react'
import { CheckCircleIcon, StopCircleIcon } from '@heroicons/react/24/outline'
import { useCancelComparison } from '../../api/queries'
import { PageHeader } from '../../components/PageHeader'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Modal } from '../../components/ui/Modal'
import type { Comparison, ComparisonStatus } from '../../types/domain'

const ORDER: ComparisonStatus[] = ['queued', 'running_baseline', 'running_candidate', 'evaluating', 'done']

function useElapsed(since: string | null) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const s = since ? Math.max(0, Math.floor((now - new Date(since).getTime()) / 1000)) : 0
  return s >= 60 ? `${Math.floor(s / 60)}분 ${s % 60}초` : `${s}초`
}

export function RunningView({ c }: { c: Comparison }) {
  const cancel = useCancelComparison(c.id)
  const [confirm, setConfirm] = useState(false)
  const elapsed = useElapsed(c.executed_at)
  const idx = ORDER.indexOf(c.status)
  const { baseline_label: base, candidate_label: cand } = c.conditions
  const n = c.inputs.length

  const steps: [string, string][] = [
    ['대기', `작업 복사본 ${n}개를 만들었어요`],
    [idx === 1 ? '기존 방식 실행 중' : '기존 방식 실행', `${base} · 작업 ${n}개`],
    [idx === 2 ? '후보 방식 실행 중' : '후보 방식 실행', `${cand} · 작업 ${n}개`],
    [idx === 3 ? '평가 중' : '평가', '지표 계산, 놓친 것 찾기, 두 결과 대조'],
    ['완료', '결과 화면으로 이동해요'],
  ]
  const taskState = (method: 'baseline' | 'candidate', i: number) => {
    const phase = method === 'baseline' ? 1 : 2
    if (idx > phase) return '완료'
    if (idx < phase) return '대기'
    return i === 0 ? '완료' : i === 1 ? '실행 중' : '대기'
  }

  return (
    <>
      <PageHeader
        crumbs={[{ label: '홈', to: '/' }, ...(c.change ? [{ label: c.change.title, to: `/changes/${c.change.id}` }] : []), { label: '비교 실행' }]}
        title="비교하는 중이에요"
        description="이 화면을 나가도 비교는 계속돼요. 끝나면 홈에서 알려 드려요."
        actions={
          <Button icon={StopCircleIcon} onClick={() => setConfirm(true)}>
            실행 취소
          </Button>
        }
      />

      <div className="grid gap-4">
        <Card title={<h2 className="text-title3">진행 상태</h2>} aside={`${elapsed} 지남 · 한도 ${Math.round((c.conditions.time_limit_sec * 2) / 60)}분`}>
          <ol className="grid gap-0" aria-label="진행 단계">
            {steps.map(([t, d], i) => {
              const done = i < idx || c.status === 'done'
              const now = i === idx && c.status !== 'done'
              return (
                <li key={i} className="flex gap-4" aria-current={now ? 'step' : undefined}>
                  <div className="flex flex-col items-center">
                    <span
                      className={`flex size-7 shrink-0 items-center justify-center rounded-full text-caption font-bold ${
                        done ? 'bg-ink text-white' : now ? 'bg-main text-ink' : 'border border-ink/30 text-ink-sub'
                      }`}
                    >
                      {done ? <CheckCircleIcon className="size-5" /> : now ? <span className="size-2.5 animate-shimmer rounded-full bg-ink" /> : i + 1}
                    </span>
                    {i < steps.length - 1 && <span aria-hidden className={`my-1 w-px flex-1 ${done ? 'bg-ink/55' : 'bg-ink/12'}`} />}
                  </div>
                  <div className="pb-5">
                    <p className={now ? 'font-bold' : done ? '' : 'text-ink-sub'}>{t}</p>
                    <p className="text-aux text-ink-sub">{d}</p>
                  </div>
                </li>
              )
            })}
          </ol>
        </Card>

        <Card padded={false} title={<h2 className="text-title3">작업별 상태</h2>} className="[&>header]:px-6 [&>header]:pt-6">
          <table className="w-full text-left text-aux">
            <thead className="text-caption text-ink-sub">
              <tr className="border-b border-ink/12">
                <th className="px-6 py-2.5 font-medium">작업</th>
                <th className="py-2.5 font-medium">기존 방식</th>
                <th className="py-2.5 font-medium">후보 방식</th>
              </tr>
            </thead>
            <tbody className="rows">
              {c.inputs.map((input, i) => (
                <tr key={input.id}>
                  <td className="px-6 py-3 font-bold">{input.label}</td>
                  <td className="py-3">{taskState('baseline', i)}</td>
                  <td className="py-3">{taskState('candidate', i)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-6 py-4 text-caption text-ink-sub">한쪽이 실패해도 다른 쪽 결과는 보여 드려요. 그때 판정은 "판단 보류"로 표시돼요.</p>
        </Card>
      </div>

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="비교를 멈출까요?"
        width={520}
        footer={
          <>
            <Button onClick={() => setConfirm(false)}>계속 실행</Button>
            <Button variant="danger" disabled={cancel.isPending} onClick={() => cancel.mutate(undefined, { onSuccess: () => setConfirm(false) })}>
              비교 멈추기
            </Button>
          </>
        }
      >
        <p>지금까지 끝난 결과는 남겨둘게요. 멈춘 비교는 판정 없이 이력에 "중단"으로 기록돼요.</p>
        <p className="mt-2 text-aux text-ink-sub">이미 쓴 사용량과 비용은 되돌릴 수 없어요.</p>
      </Modal>
    </>
  )
}
