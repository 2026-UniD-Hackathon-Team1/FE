// S-01 온보딩 / 환경 연결 (FR-01, 02). 1) 프로젝트 연결 2) 환경 확인 3) 작업 방식 등록
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { ArrowLeftIcon, ArrowRightIcon, CheckCircleIcon, CheckIcon, ClipboardDocumentIcon, ExclamationTriangleIcon, PlusIcon } from '@heroicons/react/24/outline'
import { useAddEnvItem, useAgent, useAgentCode, useEnvironment, useWorkMethods } from '../api/queries'
import { ApiError } from '../api/client'
import { RequireAuth } from '../app/AppLayout'
import { Backdrop, Wordmark } from '../components/Brand'
import { ErrorState, Loading, PermissionState } from '../components/States'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { DetailRow } from '../components/ui/DetailRow'
import { Checkbox, Field, Select, TextArea, TextInput } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { Toaster } from '../components/ui/Toast'
import { toast } from '../components/ui/toastStore'
import { formatWhen } from '../lib/labels'
import type { EnvItem } from '../types/domain'
import type { EnvItemInput } from '../types/api'

const STEPS = ['프로젝트 연결', '환경 확인', '작업 방식 등록']

function Steps({ current }: { current: number }) {
  return (
    <ol className="mb-8 flex items-center gap-3" aria-label="온보딩 단계">
      {STEPS.map((s, i) => {
        const done = i < current
        const now = i === current
        return (
          <li key={s} className="flex items-center gap-3">
            {i > 0 && <span aria-hidden className={`h-px w-14 ${done || now ? 'bg-ink/55' : 'bg-ink/12'}`} />}
            <span className="flex items-center gap-2" aria-current={now ? 'step' : undefined}>
              <span
                className={`flex size-6 items-center justify-center rounded-full text-caption font-bold ${
                  done ? 'bg-ink text-white' : now ? 'bg-main text-ink' : 'border border-ink/30 text-ink-sub'
                }`}
              >
                {done ? <CheckIcon className="size-3.5 stroke-[2.5]" /> : i + 1}
              </span>
              <span className={`text-aux ${now ? 'font-bold' : done ? '' : 'text-ink-sub'}`}>{s}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function Footer({ onPrev, next }: { onPrev?: () => void; next: React.ReactNode }) {
  return (
    <div className="mt-8 flex items-center justify-between">
      {onPrev ? (
        <Button icon={ArrowLeftIcon} onClick={onPrev}>
          이전
        </Button>
      ) : (
        <span />
      )}
      {next}
    </div>
  )
}

// ── 1단계: 프로젝트 연결 ─────────────────────────────────

function ConnectStep({ onNext }: { onNext: () => void }) {
  const agent = useAgent()
  const code = useAgentCode()
  const [scope, setScope] = useState({ config: true, skills: true, code: true })
  const connected = agent.data?.status === 'connected' && code.isSuccess

  return (
    <>
      <h1 className="text-title1">어떤 프로젝트를 연결할까요?</h1>
      <p className="mt-1 text-aux text-ink-sub">연결한 프로젝트의 AI 설정만 읽어요. 코드는 비교할 때 고른 파일만 외부 AI로 보내요.</p>
      <Card className="mt-6 grid gap-7">
        <div className="grid gap-2">
          <h2 className="text-title3">프로젝트 폴더</h2>
          <div className="flex items-center gap-2 rounded-lg border border-ink/20 bg-white py-1.5 pr-1.5 pl-4">
            <span className="flex-1 font-medium">~/work/shop-api</span>
            <Button size="sm">폴더 바꾸기</Button>
          </div>
        </div>
        <div className="grid gap-2.5">
          <h2 className="text-title3">읽을 수 있는 범위</h2>
          <p className="-mt-1.5 text-aux text-ink-sub">필요한 것만 읽어요. 나중에 [설정]에서 바꿀 수 있어요.</p>
          <Checkbox checked={scope.config} onChange={(v) => setScope({ ...scope, config: v })}>AI 도구 설정 파일 (.tool/)</Checkbox>
          <Checkbox checked={scope.skills} onChange={(v) => setScope({ ...scope, skills: v })}>설치된 스킬 목록</Checkbox>
          <Checkbox checked={scope.code} onChange={(v) => setScope({ ...scope, code: v })}>프로젝트 코드 (비교할 때 고른 파일만)</Checkbox>
        </div>
        <div className="grid gap-2.5">
          <h2 className="text-title3">연결 프로그램 실행</h2>
          <p className="-mt-1.5 text-aux text-ink-sub">내 컴퓨터에서 설정을 읽고 비교를 실행하는 작은 프로그램이에요. 터미널에 아래 명령을 붙여넣어 주세요.</p>
          {connected ? (
            <div className="flex items-center gap-3 rounded-lg bg-bg-sub px-4 py-3">
              <CheckCircleIcon aria-hidden className="size-6" />
              <div>
                <p className="font-bold">연결됐어요</p>
                <p className="text-aux text-ink-sub">
                  {agent.data?.device} · {agent.data?.version} · 방금 전
                </p>
              </div>
            </div>
          ) : code.data ? (
            <>
              <div className="flex items-center gap-3 rounded-lg bg-bg-sub py-1.5 pr-1.5 pl-4">
                <code className="flex-1 font-sans text-[15px]">{code.data.command}</code>
                <Button
                  size="sm"
                  icon={ClipboardDocumentIcon}
                  onClick={() => void navigator.clipboard?.writeText(code.data.command).then(() => toast('명령을 복사했어요'))}
                >
                  복사
                </Button>
              </div>
              <p role="status" className="flex items-center gap-2 text-aux text-ink-sub">
                <span aria-hidden className="size-2 animate-shimmer rounded-full bg-main" />
                연결을 기다리는 중이에요 · 연결되면 다음 단계로 넘어갈 수 있어요
              </p>
            </>
          ) : (
            <div>
              <Button variant="primary" onClick={() => code.mutate()} disabled={code.isPending}>
                {code.isPending ? '연결 코드 만드는 중…' : '연결 명령 받기'}
              </Button>
            </div>
          )}
        </div>
      </Card>
      <Footer
        next={
          <Button variant="primary" iconRight={ArrowRightIcon} disabled={!connected} onClick={onNext}>
            다음: 환경 확인
          </Button>
        }
      />
    </>
  )
}

// ── 2단계: 환경 확인 ─────────────────────────────────────

function AddItemModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const add = useAddEnvItem()
  const [form, setForm] = useState<EnvItemInput>({ kind: 'model', name: '', version: null, source: null, excluded: false })
  const submit = () =>
    add.mutate(form, {
      onSuccess: () => {
        toast(`${form.name}을(를) 추가했어요`)
        onClose()
      },
    })
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="항목 직접 추가"
      width={560}
      footer={
        <>
          <Button onClick={onClose}>취소</Button>
          <Button variant="primary" disabled={!form.name || add.isPending} onClick={submit}>
            추가
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <p className="text-ink-sub">자동으로 찾지 못한 모델이나 스킬을 직접 적어 주세요.</p>
        <Field label="종류">
          {(id) => (
            <Select id={id} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as EnvItemInput['kind'] })}>
              <option value="model">모델</option>
              <option value="skill">스킬</option>
              <option value="tool">도구</option>
              <option value="config">설정 파일</option>
            </Select>
          )}
        </Field>
        <Field label="이름">{(id) => <TextInput id={id} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="예: claude-sonnet" />}</Field>
        <Field label="버전" help='모르면 비워 두세요. "미확인"으로 표시해요.'>
          {(id) => <TextInput id={id} value={form.version ?? ''} onChange={(e) => setForm({ ...form, version: e.target.value || null })} />}
        </Field>
        <Field label="출처">{(id) => <TextInput id={id} value={form.source ?? ''} onChange={(e) => setForm({ ...form, source: e.target.value || null })} placeholder="예: 설정 파일, 직접 입력" />}</Field>
        <Checkbox checked={!form.excluded} onChange={(v) => setForm({ ...form, excluded: !v })}>비교 대상에 포함</Checkbox>
      </div>
    </Modal>
  )
}

function EnvStep({ onPrev, onNext }: { onPrev: () => void; onNext: () => void }) {
  const env = useEnvironment()
  const [adding, setAdding] = useState(false)
  const [excluded, setExcluded] = useState<Record<string, boolean>>({})
  const permissionNeeded = env.error instanceof ApiError && env.error.code === 'PERMISSION_REQUIRED'

  const rows: [EnvItem, string][] = env.data
    ? [
        [env.data.tool, '도구'],
        [env.data.model, '모델'],
        ...env.data.skills.map((s) => [s, '스킬'] as [EnvItem, string]),
        ...env.data.config_files.map((f) => [{ name: f.path, version: null, source: f.summary, last_checked_at: env.data.last_checked_at, excluded: false }, '설정 파일'] as [EnvItem, string]),
      ]
    : []

  return (
    <>
      <h1 className="text-title1">이 프로젝트의 AI 환경을 확인해 주세요</h1>
      <p className="mt-1 text-aux text-ink-sub">로컬 연결 프로그램이 읽어 온 목록이에요. 틀린 곳은 고치고, 비교에서 뺄 항목은 체크를 풀어 주세요.</p>
      <div className="mt-6 grid gap-4">
        {env.isPending ? (
          <Loading text="환경을 읽는 중이에요" />
        ) : permissionNeeded ? (
          <PermissionState
            title="프로젝트 폴더를 읽을 권한이 필요해요"
            reason="설치된 스킬과 설정 파일을 확인하려면 ~/work/shop-api 읽기 권한이 있어야 해요."
            action={
              <Button
                variant="primary"
                onClick={() => {
                  localStorage.removeItem('mock:perm')
                  void env.refetch()
                }}
              >
                권한 허용하기
              </Button>
            }
          />
        ) : env.isError ? (
          <ErrorState message={env.error.message} onRetry={() => void env.refetch()} />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-bg-sub px-4 py-3 text-aux">
              <span>
                <b>읽은 범위</b> · ~/work/shop-api (읽기만 했고, 아무것도 바꾸지 않았어요)
              </span>
              <Button size="sm" variant="ghost">범위 바꾸기</Button>
            </div>
            <Card padded={false} className="overflow-hidden">
              <table className="w-full text-left text-aux">
                <thead className="text-caption text-ink-sub">
                  <tr className="border-b border-ink/12">
                    <th className="w-24 px-5 py-3 font-medium">비교 대상</th>
                    <th className="py-3 font-medium">항목</th>
                    <th className="py-3 font-medium">종류</th>
                    <th className="py-3 font-medium">버전</th>
                    <th className="py-3 font-medium">출처</th>
                    <th className="py-3 font-medium">마지막 확인</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="rows">
                  {rows.map(([item, kind]) => {
                    const off = excluded[item.name] ?? item.excluded
                    return (
                      <tr key={item.name} className={off ? 'text-ink-sub' : ''}>
                        <td className="px-5 py-3">
                          <Checkbox checked={!off} onChange={(v) => setExcluded({ ...excluded, [item.name]: !v })}>
                            <span className="sr-only">{item.name} 비교 대상</span>
                          </Checkbox>
                        </td>
                        <td className="py-3 font-bold">{item.name}</td>
                        <td className="py-3">{kind}</td>
                        <td className="py-3">{kind === '설정 파일' ? '—' : (item.version ?? <b>미확인</b>)}</td>
                        <td className="py-3">{item.source ?? '—'}</td>
                        <td className="py-3">{formatWhen(item.last_checked_at)}</td>
                        <td className="px-5 py-3 text-right">
                          <Button size="sm" variant="ghost" onClick={() => setAdding(true)}>
                            {item.version || kind === '설정 파일' ? '수정' : '직접 입력'}
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </Card>
            {env.data.unreadable_files?.map((f) => (
              <div key={f} className="flex items-center gap-3 rounded-xl bg-bg-sub px-4 py-3 text-aux">
                <ExclamationTriangleIcon aria-hidden className="size-5" />
                <span className="flex-1">{f} 파일은 읽을 수 없는 형식이에요. 필요한 내용만 직접 입력해 주세요.</span>
                <Button size="sm" onClick={() => setAdding(true)}>직접 입력</Button>
              </div>
            ))}
            <div>
              <Button icon={PlusIcon} variant="ghost" onClick={() => setAdding(true)}>
                항목 직접 추가
              </Button>
            </div>
          </>
        )}
      </div>
      <Footer
        onPrev={onPrev}
        next={
          <Button variant="primary" iconRight={ArrowRightIcon} disabled={!env.isSuccess} onClick={onNext}>
            다음: 작업 방식 등록
          </Button>
        }
      />
      <AddItemModal open={adding} onClose={() => setAdding(false)} />
    </>
  )
}

// ── 3단계: 작업 방식 등록 ─────────────────────────────────

function MethodStep({ onPrev, onDone }: { onPrev: () => void; onDone: () => void }) {
  const wm = useWorkMethods()
  const review = wm.data?.find((w) => w.task_type === 'code_review')
  const test = wm.data?.find((w) => w.task_type === 'test_writing')
  const [tasks, setTasks] = useState({ code_review: true, test_writing: true })
  const [must, setMust] = useState({ 확인된결함: true, 프로젝트규칙: true, 테스트실행: false })
  const [nice, setNice] = useState({ 시간: true, 비용: true, 오탐: false })

  return (
    <>
      <h1 className="text-title1">지금은 어떻게 작업하고 있나요?</h1>
      <p className="mt-1 text-aux text-ink-sub">여기 적은 방식이 비교의 기준이 돼요. 새 방식은 항상 이 방식과 같은 조건으로 견줘 봐요.</p>
      <div className="mt-6 grid gap-4">
        <Card title={<h2 className="text-title3">주로 하는 작업</h2>} aside="여러 개 고를 수 있어요.">
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ['code_review', '코드 리뷰', '변경분을 보고 문제를 찾아요'],
                ['test_writing', '테스트 작성', '대상 코드의 테스트를 만들어요'],
              ] as const
            ).map(([k, t, d]) => (
              <div key={k} className={`rounded-xl border px-4 py-3 transition-colors duration-150 ${tasks[k] ? 'border-ink bg-white' : 'border-ink/12 bg-white/60'}`}>
                <Checkbox checked={tasks[k]} onChange={(v) => setTasks({ ...tasks, [k]: v })} description={d}>
                  <b>{t}</b>
                </Checkbox>
              </div>
            ))}
          </div>
        </Card>
        {tasks.code_review && (
          <DetailRow title="코드 리뷰 방식" summary={`자동으로 찾았어요 · ${review?.prompt ?? '…'} · 결과 형식: ${review?.output_format ?? '…'}`} modalWidth={880}>
            <div className="grid gap-4">
              <Field label="반복해서 쓰는 프롬프트" help="파일에서 불러왔어요: 리뷰 프롬프트.md">
                {(id) => <TextArea id={id} defaultValue="이 PR의 변경분을 리뷰해 줘. 버그, 보안 문제, 누락된 예외 처리를 찾고 파일과 줄 번호를 같이 알려 줘. 스타일 지적은 빼 줘." />}
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="적용 중인 스킬">{(id) => <Select id={id} defaultValue=""><option value="">없음 (프롬프트만 사용)</option></Select>}</Field>
                <Field label="원하는 결과 형식">{(id) => <TextInput id={id} defaultValue={review?.output_format ?? ''} />}</Field>
              </div>
            </div>
          </DetailRow>
        )}
        {tasks.test_writing && (
          <DetailRow title="테스트 작성 방식" summary={`자동으로 찾았어요 · ${test?.test_command ?? '…'} · 쓰는 스킬 없음`} modalWidth={880}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="테스트 실행 방법" help="비교할 때 생성한 테스트를 이 명령으로 실행해요.">{(id) => <TextInput id={id} defaultValue={test?.test_command ?? ''} />}</Field>
              <Field label="적용 중인 스킬">{(id) => <Select id={id} defaultValue=""><option value="">없음 (프롬프트만 사용)</option></Select>}</Field>
            </div>
          </DetailRow>
        )}
        <Card title={<h2 className="text-title3">비교할 때 볼 기준</h2>}>
          <div className="grid gap-8 sm:grid-cols-2">
            <div className="grid content-start gap-2.5">
              <p className="font-bold">반드시 지켜야 할 조건</p>
              <p className="-mt-2 text-aux text-ink-sub">새 방식이 하나라도 못 지키면 "기존 방식이 유리"로 판정해요.</p>
              <Checkbox checked={must.확인된결함} onChange={(v) => setMust({ ...must, 확인된결함: v })}>확인된 결함을 놓치지 않기</Checkbox>
              <Checkbox checked={must.프로젝트규칙} onChange={(v) => setMust({ ...must, 프로젝트규칙: v })}>프로젝트 규칙 지키기</Checkbox>
              <Checkbox checked={must.테스트실행} onChange={(v) => setMust({ ...must, 테스트실행: v })}>생성한 테스트가 실행되기</Checkbox>
            </div>
            <div className="grid content-start gap-2.5">
              <p className="font-bold">중요하게 볼 항목</p>
              <p className="-mt-2 text-aux text-ink-sub">판정을 뒤집지는 않고, 장단점으로 보여 줘요.</p>
              <Checkbox checked={nice.시간} onChange={(v) => setNice({ ...nice, 시간: v })}>실행 시간</Checkbox>
              <Checkbox checked={nice.비용} onChange={(v) => setNice({ ...nice, 비용: v })}>비용</Checkbox>
              <Checkbox checked={nice.오탐} onChange={(v) => setNice({ ...nice, 오탐: v })}>오탐 수</Checkbox>
            </div>
          </div>
        </Card>
      </div>
      <Footer
        onPrev={onPrev}
        next={
          <Button variant="primary" iconRight={ArrowRightIcon} disabled={!tasks.code_review && !tasks.test_writing} onClick={onDone}>
            등록하고 시작하기
          </Button>
        }
      />
    </>
  )
}

export function OnboardingPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const step = Math.min(Math.max(Number(params.get('step') ?? 1), 1), 3) - 1
  const go = (n: number) => setParams({ step: String(n) })

  return (
    <RequireAuth>
      <Backdrop />
      <header className="flex items-center justify-between px-10 py-5">
        <Wordmark />
        <span className="text-aux text-ink-sub">설정은 나중에 [설정]에서 언제든 바꿀 수 있어요</span>
      </header>
      <main className="mx-auto max-w-[880px] px-4 pt-6 pb-16">
        <Steps current={step} />
        {step === 0 && <ConnectStep onNext={() => go(2)} />}
        {step === 1 && <EnvStep onPrev={() => go(1)} onNext={() => go(3)} />}
        {step === 2 && <MethodStep onPrev={() => go(2)} onDone={() => void navigate('/')} />}
      </main>
      <Toaster />
    </RequireAuth>
  )
}
