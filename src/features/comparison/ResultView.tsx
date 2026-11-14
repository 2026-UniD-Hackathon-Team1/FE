// S-05 비교 결과 (FR-22~27, 14~16). 판정 → 지표 → 놓친 것 → 안전 정보 → 결정 → (더 확인하고 싶다면)
import { useState } from 'react'
import { useNavigate } from 'react-router'
import {
  ArrowPathIcon,
  ArrowsRightLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PencilSquareIcon,
  LightBulbIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { useDecision, useRerunComparison, useUpdateFinding } from '../../api/queries'
import { PageHeader } from '../../components/PageHeader'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { DetailRow } from '../../components/ui/DetailRow'
import { RadioCard, TextArea } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { ChoiceChip, EvidenceTag, Tag, VerificationTag } from '../../components/ui/Tag'
import { toast } from '../../components/ui/toastStore'
import { formatWhen, metricHelp, verdictLabel, verificationLabel } from '../../lib/labels'
import type { Comparison, FindingVerification } from '../../types/domain'
import { SafetyInfo } from './SafetyInfo'
import { aggregate, confirmedByBaseline, safetySummary, findingGroups, formatValue, methodsLabel, missedByCandidate, type FindingGroup, type MetricRow } from './model'

// ── 팝업: 근거 보기 (FR-23) ──────────────────────────────

function EvidenceModal({ c, row, groups, onClose }: { c: Comparison; row: MetricRow | null; groups: FindingGroup[]; onClose: () => void }) {
  const [tab, setTab] = useState<'code' | 'test' | 'log'>('code')
  if (!row) return null
  return (
    <Modal
      open={!!row}
      onClose={onClose}
      width={760}
      title={`근거 · ${row.label} ${formatValue(row.baseline, row.unit, row.total)} → ${formatValue(row.candidate, row.unit, row.total)}`}
      footer={<Button onClick={onClose}>닫기</Button>}
    >
      <div className="mb-4 flex gap-2" role="tablist">
        <ChoiceChip selected={tab === 'code'} onClick={() => setTab('code')}>
          코드 위치 {groups.length}
        </ChoiceChip>
        <ChoiceChip selected={tab === 'test'} onClick={() => setTab('test')}>
          실행 결과 {c.results.length}
        </ChoiceChip>
        <ChoiceChip selected={tab === 'log'} onClick={() => setTab('log')}>
          실행 로그
        </ChoiceChip>
      </div>
      {tab === 'code' && (
        <ul className="rows">
          {groups.map((g) => (
            <li key={g.id} className="flex items-center gap-3 py-3">
              <div className="flex-1">
                <p className="font-bold">{g.content}</p>
                <p className="text-aux text-ink-sub">
                  {g.location} · {methodsLabel(g.methods)}
                </p>
              </div>
              <VerificationTag value={g.verification} />
            </li>
          ))}
        </ul>
      )}
      {tab === 'test' && (
        <table className="w-full text-left text-aux">
          <thead className="text-caption text-ink-sub">
            <tr className="border-b border-ink/12">
              <th className="py-2 font-medium">작업</th>
              <th className="py-2 font-medium">방식</th>
              <th className="py-2 font-medium">상태</th>
              <th className="py-2 text-right font-medium">실행 시간</th>
            </tr>
          </thead>
          <tbody className="rows">
            {c.results.map((r) => (
              <tr key={r.id}>
                <td className="py-2.5">{c.inputs.find((i) => i.id === r.input_id)?.label}</td>
                <td className="py-2.5">{r.method === 'baseline' ? '기존 방식' : '후보 방식'}</td>
                <td className="py-2.5">{r.run_status === 'success' ? '성공' : r.failure_reason}</td>
                <td className="py-2.5 text-right">{r.duration_ms !== null ? `${r.duration_ms / 1000}초` : '측정 실패'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {tab === 'log' && (
        <div className="grid gap-3">
          {c.results.map((r) => (
            <div key={r.id} className="rounded-xl bg-bg-sub px-4 py-3">
              <p className="mb-1 text-caption font-bold">
                {c.inputs.find((i) => i.id === r.input_id)?.label} · {r.method === 'baseline' ? '기존 방식' : '후보 방식'}
              </p>
              <pre className="font-sans text-aux whitespace-pre-wrap text-ink-sub">{r.raw_output || r.failure_reason}</pre>
            </div>
          ))}
        </div>
      )}
      <p className="mt-4 text-caption text-ink-sub">측정값은 작업 {c.inputs.length}개 합계예요.</p>
    </Modal>
  )
}

// ── 팝업: 판정 수정 (FR-25) ──────────────────────────────

const verificationHelp: Record<FindingVerification, string> = {
  reproduced: '테스트나 직접 실행으로 문제를 재현했어요',
  user_confirmed: '코드를 보고 실제 문제라고 판단했어요',
  false_positive: '문제가 아니에요',
  needs_check: '아직 판단하지 못했어요',
}

function VerifyModal({ comparisonId, group, onClose }: { comparisonId: string; group: FindingGroup | null; onClose: () => void }) {
  const update = useUpdateFinding(comparisonId)
  const [value, setValue] = useState<FindingVerification>(group?.verification ?? 'needs_check')
  const [note, setNote] = useState('')
  if (!group) return null
  return (
    <Modal
      open={!!group}
      onClose={onClose}
      title={`판정 수정 · ${group.content}`}
      footer={
        <>
          <Button onClick={onClose}>취소</Button>
          <Button
            variant="primary"
            disabled={update.isPending}
            onClick={() =>
              update.mutate(
                {
                  id: group.findingId,
                  verification: value,
                  note: note || undefined,
                },
                {
                  onSuccess: () => {
                    toast('판정을 바꾸고 집계를 다시 계산했어요')
                    onClose()
                  },
                },
              )
            }
          >
            저장
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <p className="text-ink-sub">
          {group.location} · {methodsLabel(group.methods)} 찾은 지적이에요.
        </p>
        {(Object.keys(verificationHelp) as FindingVerification[]).map((v) => (
          <RadioCard key={v} name="verification" checked={value === v} onChange={() => setValue(v)} title={verificationLabel[v]} description={verificationHelp[v]} />
        ))}
        <label className="mt-2 grid gap-1.5">
          <span className="text-aux font-bold">이유와 근거 (선택)</span>
          <TextArea value={note} onChange={(e) => setNote(e.target.value)} placeholder="예: 취소 요청이 동시에 두 번 오면 환불 API가 두 번 호출돼요." />
        </label>
        <p className="text-aux text-ink-sub">바꾸면 집계가 다시 계산돼요. 원래 AI 출력과 바꾼 기록은 그대로 남아요.</p>
      </div>
    </Modal>
  )
}

// ── 팝업: 기존 방식 유지 이유 (FR-26) ─────────────────────

const keepReasons = ['알려진 결함을 놓침', '프로젝트 규칙을 안 지킴', '비용이 늘어남', '아직 판단이 어려움', '기타']

function KeepModal({ open, onClose, onKeep, pending }: { open: boolean; onClose: () => void; onKeep: (reason?: string) => void; pending: boolean }) {
  const [reason, setReason] = useState<string | null>(null)
  const [memo, setMemo] = useState('')
  const full = [reason, memo].filter(Boolean).join(' · ')
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="기존 방식을 유지할게요"
      width={640}
      footer={
        <>
          <Button onClick={() => onKeep()} disabled={pending}>
            건너뛰기
          </Button>
          <Button variant="primary" onClick={() => onKeep(full || undefined)} disabled={pending}>
            기록하고 유지
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <p className="text-ink-sub">이유를 남기면 나중에 이력에서 다시 볼 수 있어요. 남기지 않아도 돼요.</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="이유">
          {keepReasons.map((r) => (
            <ChoiceChip key={r} selected={reason === r} onClick={() => setReason(reason === r ? null : r)}>
              {r}
            </ChoiceChip>
          ))}
        </div>
        <label className="grid gap-1.5">
          <span className="text-aux font-bold">메모 (선택)</span>
          <TextArea rows={2} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="예: 쿠폰 만료 경계값 오류를 못 잡았어요." />
        </label>
      </div>
    </Modal>
  )
}

// ── 결과 화면 ────────────────────────────────────────────

export function ResultView({ c }: { c: Comparison }) {
  const navigate = useNavigate()
  const decide = useDecision(c.match_id, c.id)
  const rerun = useRerunComparison()
  const [evidence, setEvidence] = useState<MetricRow | null>(null)
  const [verify, setVerify] = useState<FindingGroup | null>(null)
  const [keeping, setKeeping] = useState(false)

  const { rows, okInputs, failedInputs } = aggregate(c)
  const groups = findingGroups(c)
  const missed = missedByCandidate(groups)
  const verdict = c.verdict ?? 'inconclusive'
  const failedRuns = c.results.filter((r) => r.run_status !== 'success')
  const counts = groups.reduce<Record<string, number>>((acc, g) => ({ ...acc, [g.verification]: (acc[g.verification] ?? 0) + 1 }), {})
  const isReview = rows.some((r) => r.key === 'raised')
  const { baseline_label: base, candidate_label: cand } = c.conditions

  const later = () =>
    decide.mutate(
      { action: 'later' },
      {
        onSuccess: () => {
          toast('7일 뒤에 다시 보여 드릴게요')
          void navigate('/')
        },
      },
    )
  const hide = () =>
    decide.mutate(
      { action: 'not_interested' },
      {
        onSuccess: () => {
          toast('숨긴 변화 목록으로 옮겼어요')
          void navigate('/')
        },
      },
    )
  const keep = (reason?: string) =>
    decide.mutate(
      { action: 'keep', reason },
      {
        onSuccess: () => {
          toast('기존 방식을 유지해요. 이력에 남겼어요')
          void navigate('/')
        },
      },
    )
  const again = () =>
    rerun.mutate(c.id, {
      onSuccess: (n) => void navigate(`/comparisons/${n.id}`),
    })

  return (
    <>
      <PageHeader
        crumbs={[{ label: '홈', to: '/' }, ...(c.change ? [{ label: c.change.title, to: `/changes/${c.change.id}` }] : []), { label: '비교 결과' }]}
        title="비교 결과"
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Tag tone="outline">기존 · {base}</Tag>
            <ArrowsRightLeftIcon aria-hidden className="size-4" />
            <Tag tone="outline">후보 · {cand}</Tag>
            <span>
              · 작업 {c.inputs.length}개 · 각 방식 {c.run_count}회 실행 결과 · {formatWhen(c.executed_at)} {c.is_prerecorded ? '사전 실행' : '실행'}
              {c.inputs.some((i) => i.is_example) && ' · 예제'}
            </span>
          </span>
        }
      />

      <div className="grid gap-4">
        {/* 판정 — P1: 어느 쪽이 유리해도 같은 강조 수준 */}
        <section className="glass-sub flex gap-4 p-6" aria-labelledby="verdict">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-ink/55 bg-white">
            <LightBulbIcon aria-hidden className="size-[26px]" />
          </span>
          <div className="grid justify-items-start gap-2">
            <p className="rounded-full bg-black px-2.5 py-[3px] text-[13px] leading-[22px] font-bold text-white">AI 권고 · 참고용</p>
            <h2 id="verdict" className="text-title1">
              {verdictLabel[verdict]}
            </h2>
            {c.verdict_reason && <p>{c.verdict_reason}</p>}
            <p className="text-aux text-ink-sub">
              이 판정은 비교한 작업 {okInputs.length}개와 각 방식 {c.run_count}회 실행 범위에서만 유효해요. 판정 규칙 {c.verdict_rule_version}.
            </p>
          </div>
        </section>

        {failedRuns.length > 0 && (
          <section role="alert" className="glass flex flex-wrap items-center gap-4 px-6 py-4">
            <ExclamationTriangleIcon aria-hidden className="size-6" />
            <div className="min-w-0 flex-1">
              <p className="text-title3">
                작업 {c.inputs.length}건 중 {failedInputs.length}건 실행 실패
              </p>
              <p className="text-aux text-ink-sub">
                {failedRuns.map((r) => `${c.inputs.find((i) => i.id === r.input_id)?.label} · ${r.method === 'baseline' ? '기존' : '후보'} 방식 · ${r.failure_reason}`).join(' / ')}
              </p>
            </div>
            <Button variant="primary" icon={ArrowPathIcon} onClick={again} disabled={rerun.isPending}>
              같은 조건으로 다시 실행
            </Button>
          </section>
        )}

        <Card
          padded={false}
          className="[&>header]:px-6 [&>header]:pt-6"
          title={<h2 className="text-title2">지표 비교</h2>}
          aside={
            <span className="flex flex-wrap items-center gap-1.5">
              <EvidenceTag kind="measured" />
              <EvidenceTag kind="user_verified" />
              <EvidenceTag kind="ai_note" />
              으로 근거를 구분해요
            </span>
          }
        >
          <table className="w-full text-left">
            <thead className="text-caption text-ink-sub">
              <tr className="border-b border-ink/12">
                <th className="px-6 py-2.5 font-medium">지표</th>
                <th className="py-2.5 font-medium">기존 방식</th>
                <th className="py-2.5 font-medium">후보 방식</th>
                <th className="py-2.5 font-medium">차이</th>
                <th className="py-2.5 font-medium">근거</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody className="rows">
              {rows.map((r) => (
                <tr key={r.key}>
                  <td className="px-6 py-3">
                    <p className="font-bold">{r.label}</p>
                    <p className="text-caption text-ink-sub">{metricHelp[r.key]}</p>
                  </td>
                  <td className="py-3 font-bold">{formatValue(r.baseline, r.unit, r.total)}</td>
                  <td className="py-3 font-bold">{formatValue(r.candidate, r.unit, r.total)}</td>
                  <td className="py-3">
                    {/^[▲▼]/.test(r.diff) ? (
                      <span className="inline-block rounded-full bg-main/22 px-2.5 py-1 leading-none font-bold">{r.diff}</span>
                    ) : (
                      <span className="text-aux">{r.diff}</span>
                    )}
                  </td>
                  <td className="py-3">
                    <EvidenceTag kind={r.evidence} />
                  </td>
                  <td className="pr-6">
                    <button type="button" onClick={() => setEvidence(r)} className="inline-flex items-center text-aux text-ink-sub hover:text-ink hover:underline">
                      근거 <ChevronRightIcon aria-hidden className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-6 py-4 text-caption text-ink-sub">
            모든 숫자는 작업 {okInputs.length}개 합계예요. 실패하거나 제외된 작업 {failedInputs.length}개.
          </p>
        </Card>

        <Card
          title={
            <h2 className="flex items-center gap-2 text-title2">
              후보 방식이 놓친 것 <span className="rounded-md border border-ink/55 px-2 text-aux font-bold">{missed.length}건</span>
            </h2>
          }
          aside="자동 대조는 정확하지 않을 수 있어요. 아래 원문과 함께 확인해 주세요."
        >
          {missed.length === 0 ? (
            <div className="flex gap-3 note px-4 py-3">
              <CheckCircleIcon aria-hidden className="size-5 shrink-0" />
              <div>
                <p className="font-bold">놓친 것 없음</p>
                <p className="text-aux text-ink-sub">
                  기존 방식이 찾은 확인된 문제 {rows.find((r) => r.key === 'confirmed')?.baseline ?? confirmedByBaseline(groups)}
                  건을 후보 방식도 모두 찾았어요.
                </p>
              </div>
            </div>
          ) : (
            <ul className="rows">
              {missed.map((g) => (
                <li key={g.id} className="flex items-center gap-3 py-3">
                  <ExclamationTriangleIcon aria-hidden className="size-5 shrink-0" />
                  <div className="flex-1">
                    <p className="font-bold">{g.content}</p>
                    <p className="text-aux text-ink-sub">{g.location} · 기존 방식은 찾았어요</p>
                  </div>
                  <Tag tone="solid">필수 조건</Tag>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* AC M4: 안전 정보를 보지 않고는 [바꿔보기]에 도달할 수 없다 → 결정 바로 위에 둔다 */}
        {c.candidate && (
          <DetailRow title="안전 정보" summary={safetySummary(c.candidate)}>
            <SafetyInfo candidate={c.candidate} />
          </DetailRow>
        )}

        {/* 결정 — 판정은 권고. 바꿔보기와 기존 방식 유지는 같은 강조 (디자인 시스템) */}
        <section className="flex flex-wrap items-center gap-4 rounded-xl border-2 border-black bg-white p-7 shadow-glass" aria-labelledby="decide">
          <div className="min-w-0 flex-1">
            <h2 id="decide" className="text-[22px] leading-8 font-bold">
              어떻게 할까요?
            </h2>
            <p className="text-[15px] leading-6 text-ink-sub">판정은 권고일 뿐이에요. 어떤 선택이든 고를 수 있고, 바꿔도 언제든 되돌릴 수 있어요.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" onClick={hide} disabled={decide.isPending}>
              관심 없음
            </Button>
            <Button variant="ghost" onClick={later} disabled={decide.isPending}>
              나중에
            </Button>
            <Button variant="ghost" icon={ArrowPathIcon} onClick={() => void navigate(`/comparisons/new?candidate=${c.candidate_id}&match=${c.match_id}`)}>
              추가 비교
            </Button>
            <Button onClick={() => setKeeping(true)}>
              기존 방식 유지
            </Button>
            <Button variant="primary" icon={ArrowsRightLeftIcon} onClick={() => void navigate(`/comparisons/${c.id}/switch`)}>
              바꿔보기
            </Button>
          </div>
        </section>

        <h2 className="mt-2 text-aux font-bold text-ink-sub">더 확인하고 싶다면</h2>

        <DetailRow title="원문 나란히 보기" summary={isReview ? '두 방식의 리뷰 코멘트를 나란히 볼 수 있어요' : '두 방식이 만든 테스트를 나란히 볼 수 있어요'}>
          <div className="grid gap-6">
            {c.inputs.map((input) => (
              <section key={input.id}>
                <h3 className="mb-2 font-bold">{input.label}</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {(['baseline', 'candidate'] as const).map((m) => {
                    const r = c.results.find((x) => x.input_id === input.id && x.method === m)
                    return (
                      <div key={m} className="rounded-xl bg-bg-sub px-4 py-3">
                        <p className="mb-1 flex justify-between text-caption font-bold">
                          <span>{m === 'baseline' ? '기존 방식' : '후보 방식'}</span>
                          <span className="font-normal text-ink-sub">{m === 'baseline' ? base : cand}</span>
                        </p>
                        <pre className="font-sans text-aux whitespace-pre-wrap">{r?.raw_output || `실행 실패 · ${r?.failure_reason ?? '원인 확인 불가'}`}</pre>
                      </div>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        </DetailRow>

        <DetailRow
          title={isReview ? '검증 의견' : '결함 탐지 확인'}
          summary={`지적 ${groups.length}건 · ${(Object.keys(counts) as FindingVerification[]).map((k) => `${verificationLabel[k]} ${counts[k]}`).join(' · ')}`}
        >
          <table className="w-full text-left">
            <thead className="text-caption text-ink-sub">
              <tr className="border-b border-ink/12">
                <th className="py-2 font-medium">지적 내용</th>
                <th className="py-2 font-medium">찾은 방식</th>
                <th className="py-2 font-medium">검증 상태</th>
                <th className="w-28" />
              </tr>
            </thead>
            <tbody className="rows">
              {groups.map((g) => (
                <tr key={g.id}>
                  <td className="py-3">
                    <p className="font-bold">{g.content}</p>
                    <p className="text-caption text-ink-sub">{g.location}</p>
                  </td>
                  <td className="py-3 text-aux">{methodsLabel(g.methods)}</td>
                  <td className="py-3">
                    <VerificationTag value={g.verification} />
                  </td>
                  <td className="py-3 text-right">
                    <Button size="sm" icon={PencilSquareIcon} onClick={() => setVerify(g)}>
                      판정 수정
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-caption text-ink-sub">AI 판단만으로는 확인되지 않은 지적을 정답으로 확정하지 않아요. 직접 확인한 내용을 남겨 주세요.</p>
        </DetailRow>

        {c.ai_note && (
          <DetailRow
            icon={<SparklesIcon aria-hidden className="size-5" />}
            title={<span className="text-aux font-normal text-ink-sub">AI 해설</span>}
            summary={c.ai_note.summary}
            modalTitle="AI 해설"
          >
            <div className="grid gap-3">
              <p>{c.ai_note.summary}</p>
              {c.ai_note.next_check && (
                <p className="rounded-xl bg-bg-sub px-4 py-3 text-aux">
                  <b>다음에 해 볼 수 있는 검증</b>
                  <br />
                  {c.ai_note.next_check}
                </p>
              )}
              <p className="text-caption text-ink-sub">AI가 쓴 해설이에요. 측정값이나 직접 확인한 내용과 다를 수 있어요.</p>
            </div>
          </DetailRow>
        )}
      </div>

      <EvidenceModal c={c} row={evidence} groups={groups} onClose={() => setEvidence(null)} />
      <VerifyModal key={verify?.id ?? 'none'} comparisonId={c.id} group={verify} onClose={() => setVerify(null)} />
      <KeepModal open={keeping} onClose={() => setKeeping(false)} onKeep={keep} pending={decide.isPending} />
    </>
  )
}
