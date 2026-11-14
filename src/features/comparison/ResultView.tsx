// S-05 비교 결과 (설계서 수정안 F08: 자동 판정 대신 사용자 선택).
// 내 선택 → 한눈에 비교 → 작업별 결과물 나란히 → 안전 정보 → 고르기 → (AI 해설)
// 화면의 숫자는 두 결과물에서 센 사실이고, 어느 쪽이 낫다고 정하지 않는다.
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ArrowPathIcon, ArrowRightIcon, ArrowsRightLeftIcon, CheckCircleIcon, ExclamationTriangleIcon, HandRaisedIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { useChoose, useDecision, useRerunComparison } from '../../api/queries'
import { PageHeader } from '../../components/PageHeader'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { DetailRow } from '../../components/ui/DetailRow'
import { TextArea } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { EvidenceTag, Tag } from '../../components/ui/Tag'
import { toast } from '../../components/ui/toastStore'
import { formatWhen } from '../../lib/labels'
import type { Comparison, Method } from '../../types/domain'
import { SafetyInfo } from './SafetyInfo'
import { choiceOf, glance, safetySummary, sideBySide, type Choice, type SideFinding } from './model'

const METHOD = { baseline: '기존 방식', candidate: '후보 방식' } as const
const SEVERITY_ORDER = ['심각', '보통', '사소', '미지정']

const choiceTitle: Record<Choice, string> = {
  candidate: '후보 방식을 골랐어요',
  baseline: '기존 방식을 계속 쓰기로 했어요',
  abstain: '이번엔 판단을 보류했어요',
}

const seconds = (v: number | null) => (v === null ? '측정 실패' : v >= 60 ? `${Math.floor(v / 60)}분 ${Math.round(v % 60)}초` : `${Math.round(v)}초`)

/** 고르기 확인 (이유는 선택) */
function ChooseModal({ choice, pending, onClose, onConfirm }: { choice: Choice | null; pending: boolean; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState('')
  if (!choice) return null
  const copy: Record<Choice, [string, string]> = {
    candidate: ['후보 방식을 고를까요?', '고르기만 하고 바로 바뀌지는 않아요. 다음 단계에서 바뀔 파일과 권한을 확인한 뒤 적용해요.'],
    baseline: ['기존 방식을 계속 쓸까요?', '아무것도 바뀌지 않아요. 이 변화는 홈에서 "기존 유지"로 표시돼요.'],
    abstain: ['판단을 보류할까요?', '아무것도 바뀌지 않아요. 나중에 다시 비교하거나 고를 수 있어요.'],
  }
  return (
    <Modal
      open
      onClose={onClose}
      title={copy[choice][0]}
      width={560}
      footer={
        <>
          <Button onClick={onClose}>취소</Button>
          <Button variant="primary" disabled={pending} onClick={() => onConfirm(reason)}>
            {pending ? '남기는 중…' : '이렇게 고르기'}
          </Button>
        </>
      }
    >
      <p className="mb-4 text-ink-sub">{copy[choice][1]}</p>
      <label className="grid gap-1.5">
        <span className="text-aux font-bold">이유 (선택)</span>
        <TextArea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="예: 후보가 예외 처리 문제를 더 찾았어요" />
      </label>
      <p className="mt-2 text-caption text-ink-sub">이유는 이력에 남아서 나중에 왜 바꿨는지 돌아볼 수 있어요.</p>
    </Modal>
  )
}

function OverlapTag({ f }: { f: SideFinding }) {
  if (f.overlap === 'both') return <span className="rounded-md border border-ink/20 px-1.5 text-caption text-ink-sub">둘 다 찾음</span>
  if (f.overlap === 'baseline_only') return <span className="rounded-md bg-ink px-1.5 text-caption font-bold text-white">후보는 못 찾음</span>
  return <span className="rounded-md bg-main/25 px-1.5 text-caption font-bold">후보만 찾음</span>
}

/** 한 방식의 결과물 (한 작업) */
function Side({
  method,
  label,
  list,
  summary,
  failure,
  seconds: sec,
}: {
  method: Method
  label: string
  list: SideFinding[]
  summary: string
  failure: string | null
  seconds: number | null
}) {
  return (
    <section className="grid content-start gap-2.5">
      <h3 className="flex items-baseline justify-between gap-2">
        <span className="font-bold">{METHOD[method]}</span>
        <span className="truncate text-aux text-ink-sub">
          {label} · {seconds(sec)}
        </span>
      </h3>
      {failure ? (
        <p className="flex gap-2 note px-3 py-3 text-aux">
          <ExclamationTriangleIcon aria-hidden className="size-5 shrink-0" />
          실행하지 못했어요 · {failure}
        </p>
      ) : (
        <>
          {summary && <p className="line-clamp-4 note px-3 py-2.5 text-aux whitespace-pre-line">{summary}</p>}
          {list.length === 0 ? (
            <p className="px-1 text-aux text-ink-sub">지적한 문제가 없어요.</p>
          ) : (
            <ul className="grid gap-2">
              {list.map((f) => (
                <li key={f.id} className={`rounded-lg border bg-white px-3 py-2.5 ${f.overlap === 'baseline_only' ? 'border-ink' : 'border-ink/12'}`}>
                  <p className="flex flex-wrap items-center gap-1.5 text-caption">
                    {f.severity && <Tag tone="outline">{f.severity}</Tag>}
                    <span className="text-ink-sub">{f.location}</span>
                    <OverlapTag f={f} />
                  </p>
                  <p className="mt-1 text-aux">{f.content}</p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}

export function ResultView({ c }: { c: Comparison }) {
  const navigate = useNavigate()
  const choose = useChoose(c.id, c.match_id)
  const decide = useDecision(c.match_id, c.id)
  const rerun = useRerunComparison()
  const [asking, setAsking] = useState<Choice | null>(null)
  const [tab, setTab] = useState(c.inputs[0]?.id ?? '')

  const chosen = choiceOf(c)
  const g = glance(c)
  const failedRuns = c.results.filter((r) => r.run_status !== 'success')
  const failedInputs = c.inputs.filter((i) => c.results.some((r) => r.input_id === i.id && r.run_status !== 'success'))
  const { baseline_label: base, candidate_label: cand } = c.conditions
  const switchable = c.candidate?.support_level === 'switchable'
  const s = sideBySide(c, tab)
  const sevKeys = SEVERITY_ORDER.filter((k) => g.severity.baseline[k] || g.severity.candidate[k])

  const again = () => rerun.mutate(c.id, { onSuccess: (n) => void navigate(`/comparisons/${n.id}`) })
  const confirm = (reason: string) =>
    asking &&
    choose.mutate(
      { choice: asking, reason },
      {
        onSuccess: () => {
          setAsking(null)
          toast(
            asking === 'candidate'
              ? '후보 방식을 골랐어요. 바꿀 내용을 확인해 주세요'
              : asking === 'baseline'
                ? '기존 방식을 계속 써요. 이력에 남겼어요'
                : '보류했어요. 이력에 남겼어요',
          )
          if (asking === 'candidate' && switchable) void navigate(`/comparisons/${c.id}/switch`)
        },
      },
    )
  const later = () => decide.mutate({ action: 'later' }, { onSuccess: () => (toast('7일 뒤에 다시 보여 드릴게요'), void navigate('/')) })

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
              · 작업 {c.inputs.length}개 · 각 방식 {c.run_count}회 실행 · {formatWhen(c.executed_at)} {c.is_prerecorded ? '사전 실행' : '실행'}
              {c.inputs.some((i) => i.is_example) && ' · 예제'}
            </span>
          </span>
        }
      />

      <div className="grid gap-4">
        {/* 내 선택 — 갈아탈까는 승자를 정하지 않는다 */}
        <section className="glass-sub flex flex-wrap items-center gap-4 p-6" aria-labelledby="choice">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-ink/55 bg-white">
            {chosen ? <CheckCircleIcon aria-hidden className="size-[26px]" /> : <HandRaisedIcon aria-hidden className="size-[26px]" />}
          </span>
          <div className="grid min-w-0 flex-1 justify-items-start gap-1.5">
            <p className="rounded-full bg-black px-2.5 py-[3px] text-[13px] leading-[22px] font-bold text-white">{chosen ? '내 선택' : '아직 고르지 않았어요'}</p>
            <h2 id="choice" className="text-title1">
              {chosen ? choiceTitle[chosen] : '두 결과물을 보고 골라 주세요'}
            </h2>
            {chosen && c.verdict_reason ? (
              <p>이유: {c.verdict_reason}</p>
            ) : (
              !chosen && <p className="text-ink-sub">갈아탈까는 자동으로 승자를 정하지 않아요. 아래 숫자와 결과물은 판단을 돕는 참고 정보예요.</p>
            )}
          </div>
          {chosen === 'candidate' && switchable && (
            <Button variant="primary" iconRight={ArrowRightIcon} onClick={() => void navigate(`/comparisons/${c.id}/switch`)}>
              바꾸기 진행
            </Button>
          )}
        </section>

        {failedRuns.length > 0 && (
          <section role="alert" className="glass flex flex-wrap items-center gap-4 px-6 py-4">
            <ExclamationTriangleIcon aria-hidden className="size-6" />
            <div className="min-w-0 flex-1">
              <p className="text-title3">
                작업 {c.inputs.length}건 중 {failedInputs.length}건 실행 실패
              </p>
              <p className="text-aux text-ink-sub">실패한 작업은 아래 숫자에서 빼고, 결과물 칸에 이유를 보여 드려요.</p>
            </div>
            <Button onClick={again} disabled={rerun.isPending} icon={ArrowPathIcon}>
              같은 조건으로 다시 실행
            </Button>
          </section>
        )}

        {/* 한눈에 비교 — 결과물에서 센 사실만 */}
        <Card
          padded={false}
          className="[&>header]:px-6 [&>header]:pt-6"
          title={<h2 className="text-title2">한눈에 비교</h2>}
          aside={
            <span className="flex items-center gap-1.5">
              <EvidenceTag kind="measured" /> 결과물에서 센 숫자예요
            </span>
          }
        >
          <table className="w-full text-left">
            <thead className="text-caption text-ink-sub">
              <tr className="border-b border-ink/12">
                <th className="w-[34%] px-6 py-2.5 font-medium">항목</th>
                <th className="w-[33%] py-2.5 font-medium">기존 방식</th>
                <th className="w-[33%] py-2.5 font-medium">후보 방식</th>
              </tr>
            </thead>
            <tbody className="rows">
              <tr>
                <td className="px-6 py-3 font-bold">지적한 문제</td>
                <td className="py-3 font-bold">{g.findings.baseline}건</td>
                <td className="py-3 font-bold">{g.findings.candidate}건</td>
              </tr>
              {sevKeys.length > 0 && (
                <tr>
                  <td className="px-6 py-3">
                    <p className="font-bold">심각도</p>
                    <p className="text-caption text-ink-sub">AI가 스스로 매긴 값이에요</p>
                  </td>
                  {(['baseline', 'candidate'] as const).map((m) => (
                    <td key={m} className="py-3 text-aux">
                      {sevKeys.map((k) => `${k} ${g.severity[m][k] ?? 0}`).join(' · ')}
                    </td>
                  ))}
                </tr>
              )}
              <tr>
                <td className="px-6 py-3 font-bold">실행 시간</td>
                <td className="py-3">{seconds(g.seconds.baseline)}</td>
                <td className="py-3">{seconds(g.seconds.candidate)}</td>
              </tr>
              {(g.cost.baseline || g.cost.candidate) && (
                <tr>
                  <td className="px-6 py-3 font-bold">비용</td>
                  <td className="py-3">{g.cost.baseline ?? '확인 불가'}</td>
                  <td className="py-3">{g.cost.candidate ?? '확인 불가'}</td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="grid gap-1 border-t border-ink/12 px-6 py-4">
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="font-bold">같은 문제를 찾았나요?</span>
              <span>둘 다 찾음 {g.overlap.both}건</span>
              <span className={g.overlap.baseline_only ? 'font-bold' : ''}>후보는 못 찾음 {g.overlap.baseline_only}건</span>
              <span>후보만 찾음 {g.overlap.candidate_only}건</span>
            </p>
            <p className="text-caption text-ink-sub">
              같은 파일의 가까운 줄을 지적했으면 같은 문제로 봤어요. 대략적인 대조라 아래 결과물에서 직접 확인해 주세요. 두 방식 모두 성공한 작업 {g.okInputs}개 기준이에요.
            </p>
          </div>
        </Card>

        {/* 작업별 결과물 나란히 — 판단의 중심 */}
        <Card title={<h2 className="text-title2">결과물 나란히 보기</h2>} aside={`작업 ${c.inputs.length}개`}>
          {c.inputs.length > 1 && (
            <div role="tablist" aria-label="작업" className="mb-4 flex flex-wrap gap-1 border-b border-ink/12">
              {c.inputs.map((i, n) => (
                <button
                  key={i.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === i.id}
                  onClick={() => setTab(i.id)}
                  className={`-mb-px max-w-[260px] truncate border-b-2 px-3 py-2 text-aux transition-colors duration-150 ${tab === i.id ? 'border-ink font-bold' : 'border-transparent text-ink-sub hover:text-ink'}`}
                >
                  {n + 1}. {i.label}
                </button>
              ))}
            </div>
          )}
          <div className="grid gap-5 md:grid-cols-2">
            <Side
              method="baseline"
              label={base}
              list={s.baseline}
              summary={s.base?.raw_output ?? ''}
              failure={s.base && s.base.run_status !== 'success' ? (s.base.failure_reason ?? '원인 확인 불가') : null}
              seconds={s.base?.duration_ms != null ? s.base.duration_ms / 1000 : null}
            />
            <Side
              method="candidate"
              label={cand}
              list={s.candidate}
              summary={s.cand?.raw_output ?? ''}
              failure={s.cand && s.cand.run_status !== 'success' ? (s.cand.failure_reason ?? '원인 확인 불가') : null}
              seconds={s.cand?.duration_ms != null ? s.cand.duration_ms / 1000 : null}
            />
          </div>
        </Card>

        {/* 안전 정보를 보고 나서 고르게 결정 바로 위에 둔다 (AC M4) */}
        {c.candidate && (
          <DetailRow title="안전 정보" summary={safetySummary(c.candidate)}>
            <SafetyInfo candidate={c.candidate} />
          </DetailRow>
        )}

        {/* 고르기 — 후보 선택과 실제 적용은 별도 단계 */}
        <section className="flex flex-wrap items-center gap-4 rounded-xl border-2 border-black bg-white p-7 shadow-glass" aria-labelledby="decide">
          <div className="min-w-0 flex-1">
            <h2 id="decide" className="text-[22px] leading-8 font-bold">
              {chosen ? '다시 고를 수도 있어요' : '어느 쪽을 쓸까요?'}
            </h2>
            <p className="text-[15px] leading-6 text-ink-sub">
              {switchable
                ? '후보를 골라도 바로 바뀌지 않아요. 바뀔 내용을 확인한 뒤 적용하고, 언제든 되돌릴 수 있어요.'
                : '이 후보는 직접 적용해야 해요. 후보를 고르면 적용 방법을 안내해 드려요.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" onClick={later} disabled={decide.isPending}>
              나중에
            </Button>
            <Button variant="ghost" icon={ArrowPathIcon} onClick={() => void navigate(`/comparisons/new?candidate=${c.candidate_id}&match=${c.match_id}`)}>
              다른 작업으로 비교
            </Button>
            <Button onClick={() => setAsking('abstain')}>보류</Button>
            <Button onClick={() => setAsking('baseline')}>기존 방식 유지</Button>
            <Button variant="primary" icon={ArrowsRightLeftIcon} onClick={() => setAsking('candidate')}>
              후보 방식 선택
            </Button>
          </div>
        </section>

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
              <p className="text-caption text-ink-sub">AI가 쓴 해설이에요. 결과물을 직접 확인한 내용과 다를 수 있어요.</p>
            </div>
          </DetailRow>
        )}
      </div>

      <ChooseModal key={asking ?? 'none'} choice={asking} pending={choose.isPending} onClose={() => setAsking(null)} onConfirm={confirm} />
    </>
  )
}
