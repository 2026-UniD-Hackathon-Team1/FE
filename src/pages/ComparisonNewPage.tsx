// S-04 비교 준비: 작업 선택, 외부 전송 범위, 바뀌는 조건, 실행 한도와 예상 비용 (FR-18~19, NFR-04)
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ArrowRightIcon, ChevronDownIcon, InformationCircleIcon, LockClosedIcon, PlayIcon } from '@heroicons/react/24/outline'
import { useAgent, usePrepareComparison, useStartComparison } from '../api/queries'
import { PageHeader } from '../components/PageHeader'
import { ErrorState, Loading } from '../components/States'
import { Button } from '../components/ui/Button'
import { Card, InfoList } from '../components/ui/Card'
import { DetailRow } from '../components/ui/DetailRow'
import { Checkbox, TextInput } from '../components/ui/Field'
import { Tag } from '../components/ui/Tag'
import type { InputOption } from '../types/api'
import { ApiError } from '../api/client'

/** D-07: 비교 입력 1~3건 */
const MAX_INPUTS = 3
const tabs: [InputOption['kind'], string][] = [
  ['pr', '내 PR'],
  ['files', '파일 묶음'],
  ['example', '예제 프로젝트'],
]

export function ComparisonNewPage() {
  const [params] = useSearchParams()
  const candidateId = params.get('candidate') ?? ''
  const matchId = params.get('match') ?? ''
  const prep = usePrepareComparison(candidateId)
  const agent = useAgent()
  const start = useStartComparison()
  const navigate = useNavigate()

  const [tabState, setTab] = useState<InputOption['kind'] | null>(null)
  /** 파일 묶음 탭에서 직접 적은 작업 (프로젝트 폴더 기준 경로) */
  const [custom, setCustom] = useState<InputOption[]>([])
  const [pathText, setPathText] = useState('')
  /** null이면 아직 고르지 않음 → 최근 PR 3개를 기본으로 */
  const [pickedState, setPicked] = useState<string[] | null>(null)
  const [excluded, setExcluded] = useState<string[]>([])
  /** 외부 AI로 보낼 파일 목록: 처음엔 4개만, [N개 모두 보기]로 펼침 (Figma 23:5174) */
  const [showAllFiles, setShowAllFiles] = useState(false)
  const [agree, setAgree] = useState(false)

  if (!candidateId || !matchId) return <ErrorState message="비교할 후보가 정해지지 않았어요. 변화 상세에서 다시 시작해 주세요." />
  if (prep.isPending) return <Loading text="비교를 준비하는 중이에요" />
  if (prep.isError)
    return (
      <ErrorState
        message={prep.error.message}
        onRetry={() => void prep.refetch()}
        extra={
          prep.error instanceof ApiError && prep.error.code === 'METHOD_NOT_FOUND' ? (
            <Link to="/settings" className="text-aux font-bold underline">
              작업 방식 등록하러 가기
            </Link>
          ) : undefined
        }
      />
    )

  const p = prep.data
  const inputs = [...p.inputs, ...custom]
  // 추천할 PR이 없으면 파일 묶음 탭부터 보여 준다
  const tab = tabState ?? (p.inputs.some((i) => i.kind === 'pr') ? 'pr' : 'files')
  const addCustom = () => {
    const paths = [...new Set(pathText.split(/[,\n]/).map((x) => x.trim().replace(/^\.\//, '')).filter(Boolean))]
    if (!paths.length || picked.length >= MAX_INPUTS) return
    const id = `custom-${custom.length + 1}`
    setCustom([...custom, { id, kind: 'files', label: paths.join(', '), meta: `파일 ${paths.length}개 · 직접 고름`, paths, excluded: [] }])
    setPicked([...picked, id])
    setPathText('')
  }
  const picked =
    pickedState ??
    inputs
      .filter((i) => i.kind === 'pr')
      .slice(0, MAX_INPUTS)
      .map((i) => i.id)
  const toggle = (id: string) => setPicked(picked.includes(id) ? picked.filter((x) => x !== id) : picked.length >= MAX_INPUTS ? picked : [...picked, id])
  const chosen = inputs.filter((i) => picked.includes(i.id))
  // 고른 작업들의 파일을 합쳐서 보여 준다. 같은 파일은 한 번만
  const sendFiles = [...new Set(chosen.flatMap((i) => i.paths))]
  const autoExcluded = [...new Map(chosen.flatMap((i) => i.excluded).map((f) => [f.path, f])).values()]
  const sendCount = sendFiles.filter((f) => !excluded.includes(f)).length
  const disconnected = agent.data?.status !== 'connected'
  const canStart = agree && sendCount >= 1 && picked.length >= 1 && picked.length <= MAX_INPUTS && !disconnected && !start.isPending

  const run = () =>
    start.mutate(
      {
        candidate_id: candidateId,
        match_id: matchId,
        task_type: p.task_type,
        method_id: p.method_id,
        method_version: p.method_version,
        inputs: chosen
          .map((i) => ({
            label: i.label,
            paths: i.paths.filter((f) => !excluded.includes(f)),
          }))
          .filter((i) => i.paths.length > 0),
      },
      { onSuccess: (c) => void navigate(`/comparisons/${c.id}`) },
    )

  return (
    <>
      <PageHeader
        crumbs={[{ label: '홈', to: '/' }, { label: p.change_title, to: `/changes/${p.change_id}` }, { label: '비교 준비' }]}
        title="내 작업으로 비교하기"
        description="같은 작업을 기존 방식과 후보 방식으로 한 번씩 실행해요. 본 프로젝트에는 아무것도 반영하지 않아요."
      />

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_400px]">
        <div className="grid gap-4">
          <Card title={<h2 className="text-title2">1. 비교할 작업 고르기</h2>} aside={`${1}~${MAX_INPUTS}개 · ${picked.length}개 선택됨`}>
            <div role="tablist" aria-label="작업 종류" className="mb-3 flex gap-1 border-b border-ink/12">
              {tabs.map(([k, label]) => (
                <button
                  key={k}
                  role="tab"
                  type="button"
                  aria-selected={tab === k}
                  onClick={() => setTab(k)}
                  className={`-mb-px border-b-2 px-3 py-2 text-aux transition-colors duration-150 ${tab === k ? 'border-ink font-bold' : 'border-transparent text-ink-sub hover:text-ink'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <ul className="grid gap-2">
              {inputs
                .filter((i) => i.kind === tab)
                .map((i) => {
                  const on = picked.includes(i.id)
                  const full = !on && picked.length >= MAX_INPUTS
                  return (
                    <li
                      key={i.id}
                      className={`rounded-lg border bg-white px-4 py-3 transition-colors duration-150 ${on ? 'border-ink' : 'border-ink/55'} ${full ? 'cursor-not-allowed' : ''}`}
                    >
                      <Checkbox checked={on} onChange={() => toggle(i.id)} description={i.meta}>
                        <b>{i.label}</b>
                      </Checkbox>
                    </li>
                  )
                })}
            </ul>
            {tab === 'files' && (
              <div className="mt-3 grid gap-2">
                <p className="text-aux text-ink-sub">비교할 파일을 프로젝트 폴더 기준 경로로 적어 주세요. 여러 개는 쉼표로 나눠요. 한 줄이 작업 하나예요.</p>
                <div className="flex gap-2">
                  <TextInput
                    aria-label="비교할 파일 경로"
                    value={pathText}
                    onChange={(e) => setPathText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                        e.preventDefault()
                        addCustom()
                      }
                    }}
                    placeholder="예: orders/cancel.py, orders/export.py"
                    className="flex-1"
                  />
                  <Button onClick={addCustom} disabled={!pathText.trim() || picked.length >= MAX_INPUTS}>
                    작업으로 추가
                  </Button>
                </div>
              </div>
            )}
            {tab === 'example' && <p className="mt-3 text-aux text-ink-sub">예제 결과는 내 프로젝트 결과와 구분해서 "예제"로 표시돼요. 내 코드는 외부로 보내지 않아요.</p>}
          </Card>

          <DetailRow title="2. 외부 AI로 보낼 내용" summary={`파일 ${sendCount}개 보냄 · 비밀값이 있을 수 있는 파일 ${autoExcluded.length}개 뺌`} modalWidth={744}>
            <div className="grid gap-4">
              <p className="text-aux text-ink-sub">비교에 필요한 변경분만 보내요. 보내고 싶지 않은 파일은 체크를 풀어 주세요.</p>
              {(() => {
                // 보낼 파일과 자동으로 뺀 파일을 한 목록에. 뺀 파일은 체크 해제 상태로 이유를 보여 준다
                const all = [...sendFiles.map((f) => ({ path: f, reason: null as string | null })), ...autoExcluded.map((f) => ({ path: f.path, reason: f.reason }))]
                const shown = showAllFiles ? all : all.slice(0, 4)
                return (
                  <>
                    <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                      {shown.map((f) =>
                        f.reason ? (
                          <Checkbox key={f.path} checked={false} onChange={() => {}} description={f.reason}>
                            <span className="text-aux text-ink-sub">{f.path}</span>
                          </Checkbox>
                        ) : (
                          <Checkbox key={f.path} checked={!excluded.includes(f.path)} onChange={(v) => setExcluded((cur) => (v ? cur.filter((x) => x !== f.path) : [...cur, f.path]))}>
                            <span className="text-aux">{f.path}</span>
                          </Checkbox>
                        ),
                      )}
                    </div>
                    {all.length > 4 && (
                      <button type="button" onClick={() => setShowAllFiles(!showAllFiles)} className="inline-flex items-center gap-1 justify-self-start text-aux font-bold underline underline-offset-4">
                        {showAllFiles ? '접기' : `${all.length}개 모두 보기`}
                        <ChevronDownIcon aria-hidden className={`size-4 ${showAllFiles ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                  </>
                )
              })()}
            </div>
          </DetailRow>
        </div>

        <div className="grid gap-4">
          <DetailRow stacked title="3. 바뀌는 것은 하나뿐이에요" summary="모델·입력·환경은 같고, 리뷰 방식만 바꿔요" modalWidth={696}>
            <div className="grid gap-5">
              {/* Figma 23:5506 */}
              <div>
                <p className="mb-2 text-aux text-ink-sub">바꾸는 것</p>
                <div className="flex items-center gap-3">
                  <div className="glass grid w-44 gap-2 p-4">
                    <p className="text-aux text-ink-sub">기존</p>
                    <p className="font-bold">{p.baseline_label}</p>
                  </div>
                  <ArrowRightIcon aria-hidden className="size-5" />
                  <div className="glass grid w-44 gap-2 p-4">
                    <p className="text-aux text-ink-sub">후보</p>
                    <p className="font-bold">{p.candidate_label}</p>
                  </div>
                </div>
              </div>
              <div>
                <p className="mb-2 text-aux text-ink-sub">똑같이 유지하는 것</p>
                <div className="flex flex-wrap gap-1.5">
                  {p.fixed.map((f) => (
                    <Tag key={f} icon={LockClosedIcon} tone="outline">
                      {f}
                    </Tag>
                  ))}
                </div>
              </div>
            </div>
          </DetailRow>

          <Card title={<h2 className="text-title2">4. 실행 한도와 예상 비용</h2>}>
            <InfoList
              items={[
                ['실행 횟수', `각 방식 ${p.limits.run_count}회`],
                ['시간 한도', `방식당 ${p.limits.time_limit_sec}초`],
                ['예상 시간', `${p.limits.est_minutes}분 이내`],
                ['예상 비용', p.limits.est_cost ? `${p.limits.est_cost} (사용량 기반 추정)` : '확인 불가'],
              ]}
            />
            <p className="mt-4 flex gap-2 note px-3.5 py-3 text-aux">
              <InformationCircleIcon aria-hidden className="mt-0.5 size-[18px] shrink-0" />
              AI 출력은 실행할 때마다 달라질 수 있어요. 결과는 "각 방식 1회 실행 결과"로 표시돼요.
            </p>
            <div className="mt-5 grid gap-2">
              <Checkbox checked={agree} onChange={setAgree}>
                위 내용을 외부 AI로 보내는 데 동의해요
              </Checkbox>
              <Button variant="primary" icon={PlayIcon} disabled={!canStart} onClick={run} className="mt-2 w-full">
                {start.isPending ? '시작하는 중…' : '비교 시작'}
              </Button>
              {disconnected && <p className="text-caption text-ink-sub">연결 프로그램이 꺼져 있어서 시작할 수 없어요.</p>}
              {start.isError && (
                <p role="alert" className="text-caption">
                  시작하지 못했어요: {start.error.message}
                </p>
              )}
              <Button
                variant="ghost"
                // 앱 안에서 들어왔으면 이전 화면(변화 상세나 비교 결과)으로, 주소로 바로 들어왔으면 변화 상세로
                onClick={() => void ((window.history.state?.idx ?? 0) > 0 ? navigate(-1) : navigate(`/changes/${p.change_id}`))}
                className="w-full"
              >
                취소
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}
