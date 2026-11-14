// S-07 이력 (FR-32~34): 한 줄 기록 타임라인, 필터, 상세, 되돌리기 (확인 → 충돌 → 완료)
import { useMemo, useState, type ComponentType, type SVGProps } from 'react'
import { useNavigate } from 'react-router'
import {
  ArrowPathIcon,
  ArrowUturnLeftIcon,
  ArrowsRightLeftIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ClockIcon,
  EyeIcon,
  EyeSlashIcon,
  ScaleIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'
import { useHistory, useRollback } from '../api/queries'
import { ApiError } from '../api/client'
import { PageHeader } from '../components/PageHeader'
import { EmptyState, ErrorState, Loading } from '../components/States'
import { Button } from '../components/ui/Button'
import { InfoList } from '../components/ui/Card'
import { RadioCard, Select, TextArea } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { ChoiceChip, Tag } from '../components/ui/Tag'
import { actionLabel, formatDay, formatWhen, rollbackReasonLabel } from '../lib/labels'
import type { DecisionAction, DecisionLog, TaskType } from '../types/domain'
import type { RollbackReason } from '../types/api'

type Icon = ComponentType<SVGProps<SVGSVGElement>>
const actionIcon: Record<DecisionAction, Icon> = {
  switch: ArrowsRightLeftIcon,
  keep: ShieldCheckIcon,
  more_comparison: ArrowPathIcon,
  later: ClockIcon,
  not_interested: EyeSlashIcon,
  compared: ScaleIcon,
  rolled_back: ArrowUturnLeftIcon,
}
const shortLabel: Partial<Record<DecisionAction, string>> = {
  switch: '교체',
  keep: '기존 유지',
  compared: '비교 실행',
}

const filters: [string, (a: DecisionAction) => boolean][] = [
  ['전체', () => true],
  ['교체', (a) => a === 'switch'],
  ['되돌리기', (a) => a === 'rolled_back'],
  ['비교 실행', (a) => a === 'compared'],
  ['기존 유지', (a) => a === 'keep'],
]

type Flow = {
  log: DecisionLog
  step: 'detail' | 'confirm' | 'conflict' | 'done'
}

export function HistoryPage() {
  const q = useHistory()
  const rollback = useRollback()
  const navigate = useNavigate()
  const [filter, setFilter] = useState(0)
  const [taskType, setTaskType] = useState<'all' | TaskType>('all')
  const [days, setDays] = useState(30)
  const [now] = useState(() => Date.now())
  const [flow, setFlow] = useState<Flow | null>(null)
  const [reason, setReason] = useState<RollbackReason>('worse_result')
  const [note, setNote] = useState('')
  const [strategy, setStrategy] = useState<'skip' | 'overwrite'>('skip')

  // 작업 유형·기간으로 먼저 거르고, 행동 칩의 숫자도 그 안에서 센다 (FR-34)
  const scoped = useMemo(() => {
    const since = days ? now - days * 86_400_000 : 0
    return (q.data ?? []).filter((l) => (taskType === 'all' || (l.task_types ?? []).includes(taskType)) && new Date(l.at).getTime() >= since)
  }, [q.data, taskType, days, now])

  const groups = useMemo(() => {
    const list = scoped.filter((l) => filters[filter][1](l.action))
    const map = new Map<string, DecisionLog[]>()
    for (const l of list) {
      const k = formatDay(l.at)
      map.set(k, [...(map.get(k) ?? []), l])
    }
    return [...map.entries()]
  }, [scoped, filter])

  const close = () => setFlow(null)
  const doRollback = (withStrategy: boolean) => {
    if (!flow?.log.switch_id) return
    rollback.mutate(
      {
        switchId: flow.log.switch_id,
        body: {
          reason,
          note: note || undefined,
          conflict_strategy: withStrategy ? strategy : undefined,
        },
      },
      {
        onSuccess: () => setFlow({ ...flow, step: 'done' }),
        onError: (e) => {
          if (e instanceof ApiError && e.code === 'CONFLICT') setFlow({ ...flow, step: 'conflict' })
        },
      },
    )
  }
  const canRollback = (l: DecisionLog) => l.action === 'switch' && !!l.switch_id && !(q.data ?? []).some((x) => x.action === 'rolled_back' && x.switch_id === l.switch_id)

  return (
    <>
      <PageHeader title="이력" description="무엇을 발견하고, 비교하고, 결정했는지 빠짐없이 남아 있어요." />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="행동으로 거르기">
          {filters.map(([label, fn], i) => (
            <ChoiceChip key={label} selected={filter === i} onClick={() => setFilter(i)}>
              {label} {scoped.filter((l) => fn(l.action)).length}
            </ChoiceChip>
          ))}
        </div>
        <div className="flex gap-2">
          <Select aria-label="작업 유형" value={taskType} onChange={(e) => setTaskType(e.target.value as 'all' | TaskType)} className="w-44">
            <option value="all">작업 유형: 전체</option>
            <option value="code_review">작업 유형: 코드 리뷰</option>
            <option value="test_writing">작업 유형: 테스트 작성</option>
          </Select>
          <Select aria-label="기간" value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-36">
            <option value={7}>최근 7일</option>
            <option value={30}>최근 30일</option>
            <option value={0}>전체 기간</option>
          </Select>
        </div>
      </div>

      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <ErrorState message={q.error.message} onRetry={() => void q.refetch()} />
      ) : groups.length === 0 ? (
        <EmptyState
          title={q.data?.length ? '조건에 맞는 기록이 없어요' : '아직 남은 기록이 없어요'}
          description={q.data?.length ? '작업 유형이나 기간을 바꿔 보세요.' : '변화를 비교하거나 결정하면 여기에 차례대로 쌓여요.'}
        />
      ) : (
        <div className="grid gap-6">
          {groups.map(([day, logs]) => (
            <section key={day}>
              <h2 className="mb-2 text-aux font-bold">{day}</h2>
              <ul className="glass rows overflow-hidden">
                {logs.map((l) => {
                  const I = actionIcon[l.action]
                  return (
                    <li key={l.id}>
                      <button
                        type="button"
                        onClick={() => setFlow({ log: l, step: 'detail' })}
                        className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors duration-150 hover:bg-white/60"
                      >
                        <span className="w-12 text-aux text-ink-sub">{formatWhen(l.at).slice(-5)}</span>
                        <span className="w-24">
                          <Tag tone={l.action === 'switch' ? 'solid' : 'outline'} icon={I}>
                            {shortLabel[l.action] ?? actionLabel[l.action]}
                          </Tag>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-bold">{l.change_title}</span>
                          {l.summary && <span className="block text-aux">{l.summary}</span>}
                          {l.reason && <span className="block text-caption text-ink-sub">이유: {l.reason}</span>}
                          {l.stale_environment && <span className="block text-caption text-ink-sub">이전 환경에서 실행한 결과</span>}
                        </span>
                        <ChevronRightIcon aria-hidden className="size-5 text-ink-sub" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
          <p className="text-caption text-ink-sub">도구 1.3.x에서 실행한 결과에는 "이전 환경에서 실행한 결과"라고 표시해요.</p>
        </div>
      )}

      {/* 상세 */}
      <Modal
        open={flow?.step === 'detail'}
        onClose={close}
        width={720}
        title={flow ? `${shortLabel[flow.log.action] ?? actionLabel[flow.log.action]} 기록 · ${flow.log.change_title}` : ''}
        footer={
          <>
            {flow?.log.comparison_id && (
              <Button icon={EyeIcon} onClick={() => void navigate(`/comparisons/${flow.log.comparison_id}`)}>
                비교 결과 보기
              </Button>
            )}
            {flow && canRollback(flow.log) ? (
              <Button icon={ArrowUturnLeftIcon} onClick={() => setFlow({ ...flow, step: 'confirm' })}>
                이전 방식으로 되돌리기
              </Button>
            ) : (
              <Button onClick={close}>닫기</Button>
            )}
          </>
        }
      >
        {flow && (
          <InfoList
            items={[
              ['행동', actionLabel[flow.log.action]],
              ['시각', `${formatDay(flow.log.at)} ${formatWhen(flow.log.at).slice(-5)}`],
              ['결과', flow.log.summary ?? '—'],
              ['이유', flow.log.reason ?? '남기지 않았어요'],
              ...(flow.log.switch_id ? ([['백업', canRollback(flow.log) ? '유효 · 되돌릴 수 있어요' : '복원에 사용됨']] as [string, string][]) : []),
            ]}
          />
        )}
      </Modal>

      {/* 되돌리기 확인 (FR-32) */}
      <Modal
        open={flow?.step === 'confirm'}
        onClose={close}
        title="이 교체를 되돌릴까요?"
        footer={
          <>
            <Button onClick={close}>취소</Button>
            <Button variant="primary" icon={ArrowUturnLeftIcon} disabled={rollback.isPending} onClick={() => doRollback(false)}>
              {rollback.isPending ? '되돌리는 중…' : '되돌리기'}
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <p className="text-ink-sub">{flow && formatWhen(flow.log.at)}에 저장한 백업으로 돌아가요. 이 교체에서 바꾼 것만 되돌려요.</p>
          <ul className="rows">
            {[
              ['스킬', flow?.log.summary?.split('→')[1]?.trim() ?? '교체한 스킬', '제거'],
              ['.codex/config.toml', '지금 내용', '교체 전 내용'],
              ['리뷰 프롬프트', '사용 안 함', '다시 사용'],
            ].map(([k, a, b]) => (
              <li key={k} className="flex items-center gap-3 py-2.5 text-aux">
                <span className="w-40 text-ink-sub">{k}</span>
                <span>{a}</span>
                <span aria-hidden className="text-ink-sub">
                  →
                </span>
                <b>{b}</b>
              </li>
            ))}
          </ul>
          <div className="grid gap-2">
            <span className="text-aux font-bold">되돌리는 이유 (선택)</span>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(rollbackReasonLabel) as RollbackReason[]).map((r) => (
                <ChoiceChip key={r} selected={reason === r} onClick={() => setReason(r)}>
                  {rollbackReasonLabel[r]}
                </ChoiceChip>
              ))}
            </div>
            {reason === 'other' && <TextArea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="이유를 적어 주세요" />}
          </div>
          <p className="text-aux text-ink-sub">이미 쓴 API 비용은 되돌릴 수 없어요.</p>
        </div>
      </Modal>

      {/* 충돌 (TC-11): 자동 덮어쓰기를 멈추고 고르게 한다 */}
      <Modal
        open={flow?.step === 'conflict'}
        onClose={close}
        title="직접 고친 파일이 있어요"
        footer={
          <>
            <Button onClick={close}>취소</Button>
            <Button variant="primary" disabled={rollback.isPending} onClick={() => doRollback(true)}>
              계속
            </Button>
          </>
        }
      >
        <div className="grid gap-3">
          <p className="text-ink-sub">.codex/config.toml을 교체한 뒤에 직접 수정했어요. 그냥 되돌리면 그 수정이 사라져요.</p>
          <RadioCard
            name="conflict"
            checked={strategy === 'skip'}
            onChange={() => setStrategy('skip')}
            title="이 파일은 건너뛰고 되돌리기"
            description="스킬과 프롬프트만 되돌리고, 직접 고친 설정은 그대로 둬요"
          />
          <RadioCard
            name="conflict"
            checked={strategy === 'overwrite'}
            onChange={() => setStrategy('overwrite')}
            title="내 수정을 덮어쓰고 되돌리기"
            description="교체 전 백업 내용으로 바꿔요. 내 수정은 사라져요"
          />
        </div>
      </Modal>

      {/* 완료 */}
      <Modal
        open={flow?.step === 'done'}
        onClose={close}
        title="원래대로 되돌렸어요"
        footer={
          <Button variant="primary" onClick={close}>
            확인
          </Button>
        }
      >
        <ul className="grid gap-2.5">
          {[
            '교체한 스킬을 제거했어요',
            strategy === 'skip' ? '직접 고친 설정은 그대로 뒀어요' : '설정을 교체 전으로 돌렸어요',
            '리뷰 프롬프트를 다시 써요 · 스킬 등록과 설정 검사도 통과했어요',
          ].map((t) => (
            <li key={t} className="flex gap-3 rounded-[10px] border border-ink/12 px-3.5 py-3">
              <CheckCircleIcon aria-hidden className="size-6 shrink-0" />
              <span className="font-bold">{t}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-aux text-ink-sub">이력에 "되돌리기 · {rollbackReasonLabel[reason]}"로 남겼어요. 백업은 지우지 않아서 다시 바꿀 수도 있어요.</p>
      </Modal>
    </>
  )
}
