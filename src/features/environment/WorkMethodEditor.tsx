// 기존 작업 방식 등록·수정 (FR-02). 온보딩 4단계와 설정에서 같이 쓴다.
import type { ReactNode } from 'react'
import { Card } from '../../components/ui/Card'
import { DetailRow } from '../../components/ui/DetailRow'
import { Checkbox, Field, Select, TextArea, TextInput } from '../../components/ui/Field'
import { MUST_OPTIONS, NICE_OPTIONS, type MethodDraft } from './methodDraft'

/** 설치된 스킬 목록에서 고른다 */
function SkillSelect({ id, value, onChange, skills }: { id: string; value: string; onChange: (v: string) => void; skills: string[] }) {
  return (
    <Select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">없음 (프롬프트만 사용)</option>
      {skills.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </Select>
  )
}

const toggleIn = (list: string[], v: string, on: boolean) => (on ? [...new Set([...list, v])] : list.filter((x) => x !== v))

interface EditorProps {
  draft: MethodDraft
  onChange: (d: MethodDraft) => void
  skills: string[]
  /** 팝업 안에서는 접지 않고 펼쳐서 보여준다 */
  compact?: boolean
  /** 1단계로 돌아가 맡기는 작업을 바꾼다 */
  onEditTasks?: () => void
}

export function WorkMethodEditor({ draft: d, onChange, skills, compact, onEditTasks }: EditorProps) {
  const set = (patch: Partial<MethodDraft>) => onChange({ ...d, ...patch })

  const reviewFields = (
    <div className="grid gap-4">
      <Field label="반복해서 쓰는 프롬프트" help="비교할 때 기존 방식으로 이 프롬프트를 그대로 실행해요.">
        {(id) => (
          <TextArea
            id={id}
            rows={4}
            value={d.review.prompt}
            onChange={(e) => set({ review: { ...d.review, prompt: e.target.value } })}
            placeholder="예: 이 PR의 변경분을 리뷰해 줘…"
          />
        )}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="적용 중인 스킬">{(id) => <SkillSelect id={id} value={d.review.skill} skills={skills} onChange={(v) => set({ review: { ...d.review, skill: v } })} />}</Field>
        <Field label="원하는 결과 형식">
          {(id) => <TextInput id={id} value={d.review.output_format} onChange={(e) => set({ review: { ...d.review, output_format: e.target.value } })} />}
        </Field>
      </div>
    </div>
  )
  const testFields = (
    <div className="grid gap-4">
      <Field label="반복해서 쓰는 프롬프트">
        {(id) => (
          <TextArea id={id} rows={3} value={d.test.prompt} onChange={(e) => set({ test: { ...d.test, prompt: e.target.value } })} placeholder="예: 이 파일의 테스트를 작성해 줘…" />
        )}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="테스트 실행 방법" help="생성한 테스트를 이 명령으로 실행해요. 꼭 필요해요.">
          {(id) => <TextInput id={id} value={d.test.test_command} onChange={(e) => set({ test: { ...d.test, test_command: e.target.value } })} />}
        </Field>
        <Field label="적용 중인 스킬">{(id) => <SkillSelect id={id} value={d.test.skill} skills={skills} onChange={(v) => set({ test: { ...d.test, skill: v } })} />}</Field>
      </div>
    </div>
  )

  const section = (title: string, summary: string, body: ReactNode) =>
    compact ? (
      <section className="grid gap-3 border-t border-ink/12 pt-5">
        <h3 className="text-title2">{title}</h3>
        {body}
      </section>
    ) : (
      <DetailRow title={title} summary={summary} modalWidth={880}>
        {body}
      </DetailRow>
    )

  const criteria = (
    <div className="grid gap-8 sm:grid-cols-2">
      <div className="grid content-start gap-2.5">
        <p className="font-bold">반드시 지켜야 할 조건</p>
        <p className="-mt-2 text-aux text-ink-sub">새 방식이 하나라도 못 지키면 "기존 방식이 유리"로 판정해요.</p>
        {MUST_OPTIONS.map((o) => (
          <Checkbox key={o} checked={d.must.includes(o)} onChange={(v) => set({ must: toggleIn(d.must, o, v) })}>
            {o}
          </Checkbox>
        ))}
      </div>
      <div className="grid content-start gap-2.5">
        <p className="font-bold">중요하게 볼 항목</p>
        <p className="-mt-2 text-aux text-ink-sub">판정을 뒤집지는 않고, 장단점으로 보여 줘요.</p>
        {NICE_OPTIONS.map((o) => (
          <Checkbox key={o} checked={d.nice.includes(o)} onChange={(v) => set({ nice: toggleIn(d.nice, o, v) })}>
            {o}
          </Checkbox>
        ))}
      </div>
    </div>
  )

  const none = !d.tasks.code_review && !d.tasks.test_writing
  /** 어떤 작업을 하는지는 1단계 "나에 대해"에서 받는다. 여기서는 그중 비교할 수 있는 작업의 지금 방식만 적는다 */
  const tasksNote = (
    <p className="text-aux text-ink-sub">
      {none ? '고른 작업 중 비교할 수 있는 작업(코드 리뷰, 테스트 작성)이 없어요. ' : '1단계에서 고른 작업 중 비교할 수 있는 코드 리뷰, 테스트 작성의 지금 방식을 적어 주세요. '}
      {onEditTasks && (
        <button type="button" onClick={onEditTasks} className="font-bold text-ink underline">
          작업 바꾸기
        </button>
      )}
    </p>
  )

  const reviewSummary = `${d.review.prompt ? '프롬프트 등록됨' : '프롬프트 없음'} · ${d.review.skill || '스킬 없음'} · 결과 형식: ${d.review.output_format || '지정 안 함'}`
  const testSummary = `${d.test.test_command || '실행 방법을 입력해 주세요'} · ${d.test.skill || '스킬 없음'}`

  if (compact)
    return (
      <div className="grid gap-5">
        {tasksNote}
        {d.tasks.code_review && section('코드 리뷰 방식', reviewSummary, reviewFields)}
        {d.tasks.test_writing && section('테스트 작성 방식', testSummary, testFields)}
        <section className="grid gap-3 border-t border-ink/12 pt-5">
          <h3 className="text-title2">비교할 때 볼 기준</h3>
          {criteria}
        </section>
      </div>
    )

  return (
    <div className="grid gap-4">
      {tasksNote}
      {d.tasks.code_review && section('코드 리뷰 방식', reviewSummary, reviewFields)}
      {d.tasks.test_writing && section('테스트 작성 방식', testSummary, testFields)}
      <Card title={<h2 className="text-title2">비교할 때 볼 기준</h2>}>{criteria}</Card>
    </div>
  )
}
