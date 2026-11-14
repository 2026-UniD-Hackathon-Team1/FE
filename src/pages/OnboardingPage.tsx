// S-01 온보딩 (FR-01, 02). 1) 나와 프로젝트(프로필·폴더) 2) 환경 확인 3) 작업 방식 등록
// ?from=settings 로 들어오면 설정에서 환경을 고치러 온 것이라 저장 뒤 설정으로 돌아간다.
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { ArrowLeftIcon, ArrowRightIcon, CheckCircleIcon, CheckIcon, ClipboardDocumentIcon, ExclamationTriangleIcon, PlusIcon } from '@heroicons/react/24/outline'
import {
  useAgent,
  useEnvironment,
  usePairingCode,
  useProfile,
  useProject,
  useSaveProfile,
  useSaveWorkMethods,
  useUpdateEnvItem,
  useUpdateProject,
  useWorkMethods,
} from '../api/queries'
import { ApiError } from '../api/client'
import { Backdrop, Wordmark } from '../components/Brand'
import { ErrorState, Loading, PermissionState } from '../components/States'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Checkbox, Field, Select, TextInput } from '../components/ui/Field'
import { ChoiceChip } from '../components/ui/Tag'
import { Toaster } from '../components/ui/Toast'
import { toast } from '../components/ui/toastStore'
import { EnvItemModal } from '../features/environment/EnvItemModal'
import { WorkMethodEditor } from '../features/environment/WorkMethodEditor'
import { draftValid, fromDraft, toDraft, type MethodDraft } from '../features/environment/methodDraft'
import { ScopeModal } from '../features/project/ScopeModal'
import { accessScopeLabel, formatWhen, goalLabel, languageLabel, roleOptions, taskTypeLabel } from '../lib/labels'
import type { EnvItemInput } from '../types/api'
import type { TaskType } from '../types/domain'

const STEPS = ['나에 대해', '프로젝트 연결', '환경 확인', '작업 방식 등록']
const READ_SCOPES = ['config', 'skills', 'code']

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

// ── 연결 프로그램 블록 ───────────────────────────────────

function CopyLine({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-bg-sub py-1.5 pr-1.5 pl-4">
      <code className="flex-1 font-sans text-[15px]">{text}</code>
      <Button size="sm" icon={ClipboardDocumentIcon} onClick={() => void navigator.clipboard?.writeText(text).then(() => toast('명령을 복사했어요'))}>
        복사
      </Button>
    </div>
  )
}

/** 연결 프로그램: 설치 → 연결 코드 → 연결 대기 (docs/agent-design.md) */
function AgentConnect() {
  const pairing = usePairingCode()
  const waiting = !!pairing.data
  const agent = useAgent(waiting)
  const a = agent.data
  if (agent.isPending) return <p className="text-aux text-ink-sub">연결 상태를 확인하는 중이에요…</p>
  if (a?.status === 'connected')
    return (
      <div className="flex items-center gap-3 rounded-lg bg-bg-sub px-4 py-3">
        <CheckCircleIcon aria-hidden className="size-6" />
        <div>
          <p className="font-bold">연결됐어요</p>
          <p className="text-aux text-ink-sub">
            {a.device_name ?? '내 컴퓨터'} · Codex CLI {a.runner_version ?? '버전 미확인'}
            {a.runner_ready ? '' : ' · Codex CLI 로그인이 필요해요'}
          </p>
        </div>
      </div>
    )
  if (a?.status === 'disconnected' && !waiting)
    return (
      <div className="grid gap-2">
        <p className="text-aux">전에 연결한 컴퓨터가 꺼져 있어요. 터미널에서 다시 켜 주세요.</p>
        <CopyLine text="galtalka run" />
      </div>
    )
  return (
    <div className="grid gap-3">
      <div className="grid gap-1.5">
        <p className="text-aux font-bold">1. 설치 (처음 한 번만)</p>
        <CopyLine text={pairing.data?.install_command ?? 'uv tool install galtalka'} />
      </div>
      <div className="grid gap-1.5">
        <p className="text-aux font-bold">2. 연결</p>
        {pairing.data ? (
          <>
            <CopyLine text={pairing.data.command} />
            <p role="status" className="flex items-center gap-2 text-aux text-ink-sub">
              <span aria-hidden className="size-2 animate-shimmer rounded-full bg-main" />
              연결을 기다리는 중이에요 · 코드는 {formatWhen(pairing.data.expires_at)}까지 쓸 수 있어요
            </p>
          </>
        ) : (
          <div>
            <Button onClick={() => pairing.mutate()} disabled={pairing.isPending}>
              {pairing.isPending ? '연결 코드 만드는 중…' : '연결 명령 받기'}
            </Button>
            {pairing.isError && (
              <p role="alert" className="mt-2 text-aux">
                {pairing.error.message}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const flip = <T,>(list: T[], v: T, on: boolean) => (on ? [...new Set([...list, v])] : list.filter((x) => x !== v))

/** 저장된 값을 받아 온 뒤 폼을 연다 (처음이면 기본값) */
function Gate({ children }: { children: React.ReactNode }) {
  const profile = useProfile()
  const project = useProject()
  if (profile.isPending || project.isPending) return <Loading />
  return <>{children}</>
}

// ── 1단계: 나에 대해 ─────────────────────────────────────

function AboutStep({ onNext }: { onNext: () => void }) {
  const profile = useProfile()
  const save = useSaveProfile()
  const p = profile.data
  const [role, setRole] = useState(p?.role ?? roleOptions[0])
  const [lang, setLang] = useState(p?.primary_language ?? 'python')
  const [tasks, setTasks] = useState<TaskType[]>(p?.task_types ?? ['code_review', 'test_writing'])
  const [goals, setGoals] = useState<string[]>(p?.goals ?? [])

  return (
    <>
      <h1 className="text-title1">어떤 일을 하고 있나요?</h1>
      <p className="mt-1 text-aux text-ink-sub">내 일과 상관있는 변화만 골라 드리는 데 써요. 나중에 [설정]에서 바꿀 수 있어요.</p>
      <Card className="mt-6 grid gap-7">
        <div className="grid items-start gap-4 sm:grid-cols-2">
          <Field label="역할">
            {(id) => (
              <Select id={id} value={role} onChange={(e) => setRole(e.target.value)}>
                {roleOptions.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="주로 쓰는 언어" help="MVP는 Python 프로젝트로 비교해요">
            {(id) => (
              <Select id={id} value={lang} onChange={(e) => setLang(e.target.value)}>
                {Object.entries(languageLabel).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <div className="grid gap-2.5">
          <h2 className="text-title3">AI에게 맡기는 작업</h2>
          <p className="-mt-1.5 text-aux text-ink-sub">하나 이상 골라 주세요. 고른 작업에 영향 있는 변화만 보여 드려요.</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(taskTypeLabel) as TaskType[]).map((t) => (
              <ChoiceChip key={t} selected={tasks.includes(t)} onClick={() => setTasks(flip(tasks, t, !tasks.includes(t)))}>
                {taskTypeLabel[t]}
              </ChoiceChip>
            ))}
          </div>
        </div>
        <div className="grid gap-2.5">
          <h2 className="text-title3">요즘 신경 쓰는 것</h2>
          <p className="-mt-1.5 text-aux text-ink-sub">고르지 않아도 돼요. 고르면 관련 변화를 먼저 보여 드려요.</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(goalLabel).map(([k, v]) => (
              <ChoiceChip key={k} selected={goals.includes(k)} onClick={() => setGoals(flip(goals, k, !goals.includes(k)))}>
                {v}
              </ChoiceChip>
            ))}
          </div>
        </div>
      </Card>
      {save.isError && (
        <p role="alert" className="mt-4 text-aux">
          저장하지 못했어요: {save.error.message}
        </p>
      )}
      <Footer
        next={
          <Button
            variant="primary"
            iconRight={ArrowRightIcon}
            disabled={tasks.length === 0 || save.isPending}
            onClick={() => save.mutate({ role, primary_language: lang, task_types: tasks, goals }, { onSuccess: onNext })}
          >
            {save.isPending ? '저장하는 중…' : '다음: 프로젝트 연결'}
          </Button>
        }
      />
    </>
  )
}

// ── 2단계: 프로젝트 연결 ─────────────────────────────────

function ProjectStep({ onPrev, onNext }: { onPrev: () => void; onNext: () => void }) {
  const agent = useAgent()
  const project = useProject()
  const updateProject = useUpdateProject()
  const [dir, setDir] = useState(project.data?.work_dir ?? '')
  const [scope, setScope] = useState<string[]>(project.data?.access_scope.filter((k) => READ_SCOPES.includes(k)) ?? READ_SCOPES)
  const connected = agent.data?.status === 'connected'
  const valid = connected && dir.trim() !== '' && scope.includes('config')

  return (
    <>
      <h1 className="text-title1">어떤 프로젝트를 연결할까요?</h1>
      <p className="mt-1 text-aux text-ink-sub">연결 프로그램이 이 폴더의 Codex 설정과 스킬만 읽어요. 코드는 비교할 때 고른 파일만 외부 AI로 보내요.</p>
      <Card className="mt-6 grid gap-7">
        <Field label="프로젝트 폴더" help="연결 프로그램을 설치한 컴퓨터 기준 경로예요">
          {(id) => <TextInput id={id} value={dir} onChange={(e) => setDir(e.target.value)} placeholder="~/work/my-project" />}
        </Field>
        <div className="grid gap-2.5">
          <h2 className="text-title3">읽을 수 있는 범위</h2>
          <p className="-mt-1.5 text-aux text-ink-sub">필요한 것만 읽어요. 나중에 [설정]에서 바꿀 수 있어요.</p>
          {READ_SCOPES.map((k) => (
            <Checkbox key={k} checked={scope.includes(k)} onChange={(v) => setScope(flip(scope, k, v))}>
              {accessScopeLabel[k]}
            </Checkbox>
          ))}
          {!scope.includes('config') && (
            <p role="alert" className="flex items-center gap-2 text-aux">
              <ExclamationTriangleIcon aria-hidden className="size-4" />
              Codex 설정 파일을 읽어야 내 환경을 확인할 수 있어요.
            </p>
          )}
        </div>
        <div className="grid gap-2.5">
          <h2 className="text-title3">연결 프로그램</h2>
          <p className="-mt-1.5 text-aux text-ink-sub">내 컴퓨터에서 폴더를 읽고 비교를 실행하는 작은 프로그램이에요. 한 번 설치하고 아래 명령으로 연결해 주세요.</p>
          <AgentConnect />
        </div>
      </Card>
      {updateProject.isError && (
        <p role="alert" className="mt-4 text-aux">
          폴더를 읽지 못했어요: {updateProject.error.message}
        </p>
      )}
      <Footer
        onPrev={onPrev}
        next={
          <Button
            variant="primary"
            iconRight={ArrowRightIcon}
            disabled={!valid || updateProject.isPending}
            onClick={() => updateProject.mutate({ work_dir: dir.trim(), access_scope: scope }, { onSuccess: onNext })}
          >
            {updateProject.isPending ? '환경을 읽는 중…' : '다음: 환경 확인'}
          </Button>
        }
      />
    </>
  )
}

// ── 3단계: 환경 확인 ─────────────────────────────────────

type Row = {
  kind: EnvItemInput['kind']
  kindLabel: string
  name: string
  version: string | null
  source: string | null
  checked: string | null
  excluded: boolean
}

function EnvStep({ onPrev, onNext, nextLabel }: { onPrev?: () => void; onNext: () => void; nextLabel: string }) {
  const env = useEnvironment()
  const project = useProject()
  const update = useUpdateEnvItem()
  const [modal, setModal] = useState<{
    initial?: EnvItemInput
    edit?: boolean
  } | null>(null)
  const [scopeOpen, setScopeOpen] = useState(false)
  const permissionNeeded = env.error instanceof ApiError && env.error.status === 403

  const e = env.data
  const rows: Row[] = e
    ? [
        {
          kind: 'tool',
          kindLabel: '도구',
          ...e.tool,
          checked: e.tool.last_checked_at,
        },
        {
          kind: 'model',
          kindLabel: '모델',
          ...e.model,
          checked: e.model.last_checked_at,
        },
        ...e.skills.map((s) => ({
          kind: 'skill' as const,
          kindLabel: '스킬',
          ...s,
          checked: s.last_checked_at,
        })),
        ...e.config_files.map((f) => ({
          kind: 'config' as const,
          kindLabel: '설정 파일',
          name: f.path,
          version: null,
          source: f.summary,
          checked: e.last_checked_at,
          excluded: !!f.excluded,
        })),
      ]
    : []
  const input = (r: Row): EnvItemInput => ({
    kind: r.kind,
    name: r.name,
    version: r.version,
    source: r.source,
    excluded: r.excluded,
  })

  return (
    <>
      <h1 className="text-title1">이 프로젝트의 AI 환경을 확인해 주세요</h1>
      <p className="mt-1 text-aux text-ink-sub">연결 프로그램이 읽어 온 목록이에요. 틀린 곳은 고치고, 비교에서 뺄 항목은 체크를 풀어 주세요.</p>
      <div className="mt-6 grid gap-4">
        {env.isPending ? (
          <Loading text="환경을 읽는 중이에요" />
        ) : permissionNeeded ? (
          <PermissionState
            title="프로젝트 폴더를 읽을 권한이 필요해요"
            reason={`설치된 스킬과 설정 파일을 확인하려면 ${project.data?.work_dir ?? '프로젝트 폴더'} 읽기 권한이 있어야 해요.`}
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
                <b>읽은 범위</b> · {project.data?.work_dir} (읽기만 했고, 아무것도 바꾸지 않았어요)
              </span>
              <Button size="sm" variant="ghost" onClick={() => setScopeOpen(true)}>
                범위 바꾸기
              </Button>
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
                  {rows.map((r) => (
                    <tr key={r.kind + r.name} className={r.excluded ? 'text-ink-sub' : ''}>
                      <td className="px-5 py-3">
                        <Checkbox
                          checked={!r.excluded}
                          onChange={(v) =>
                            update.mutate({
                              name: r.name,
                              body: { ...input(r), excluded: !v },
                            })
                          }
                        >
                          <span className="sr-only">{r.name} 비교 대상</span>
                        </Checkbox>
                      </td>
                      <td className="py-3 font-bold">{r.name}</td>
                      <td className="py-3">{r.kindLabel}</td>
                      <td className="py-3">{r.kind === 'config' ? '—' : (r.version ?? <b>미확인</b>)}</td>
                      <td className="py-3">{r.source ?? '—'}</td>
                      <td className="py-3">{formatWhen(r.checked)}</td>
                      <td className="px-5 py-3 text-right">
                        <Button size="sm" variant="ghost" onClick={() => setModal({ initial: input(r), edit: true })}>
                          {r.version || r.kind === 'config' ? '수정' : '직접 입력'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
            {e?.unreadable_files?.map((f) => (
              <div key={f} className="flex items-center gap-3 rounded-xl bg-bg-sub px-4 py-3 text-aux">
                <ExclamationTriangleIcon aria-hidden className="size-5" />
                <span className="flex-1">{f} 파일은 읽을 수 없는 형식이에요. 필요한 내용만 직접 입력해 주세요.</span>
                <Button
                  size="sm"
                  onClick={() =>
                    setModal({
                      initial: {
                        kind: 'config',
                        name: f,
                        version: null,
                        source: '직접 입력',
                        excluded: false,
                      },
                    })
                  }
                >
                  직접 입력
                </Button>
              </div>
            ))}
            <div>
              <Button icon={PlusIcon} variant="ghost" onClick={() => setModal({})}>
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
            {nextLabel}
          </Button>
        }
      />
      <EnvItemModal open={!!modal} initial={modal?.initial} edit={modal?.edit} onClose={() => setModal(null)} />
      <ScopeModal open={scopeOpen} onClose={() => setScopeOpen(false)} />
    </>
  )
}

// ── 4단계: 작업 방식 등록 ─────────────────────────────────

function MethodForm({ initial, skills, onPrev, onDone, onEditTasks }: { initial: MethodDraft; skills: string[]; onPrev: () => void; onDone: () => void; onEditTasks: () => void }) {
  const save = useSaveWorkMethods()
  const [draft, setDraft] = useState(initial)
  return (
    <>
      <div className="mt-6">
        <WorkMethodEditor draft={draft} onChange={setDraft} skills={skills} onEditTasks={onEditTasks} />
      </div>
      {save.isError && (
        <p role="alert" className="mt-4 text-aux">
          저장하지 못했어요: {save.error.message}
        </p>
      )}
      <Footer
        onPrev={onPrev}
        next={
          <Button variant="primary" iconRight={ArrowRightIcon} disabled={!draftValid(draft) || save.isPending} onClick={() => save.mutate(fromDraft(draft), { onSuccess: onDone })}>
            {save.isPending ? '저장하는 중…' : '등록하고 시작하기'}
          </Button>
        }
      />
    </>
  )
}

function MethodStep({ onPrev, onDone, onEditTasks }: { onPrev: () => void; onDone: () => void; onEditTasks: () => void }) {
  const wm = useWorkMethods()
  const profile = useProfile()
  const env = useEnvironment()
  return (
    <>
      <h1 className="text-title1">지금은 어떻게 작업하고 있나요?</h1>
      <p className="mt-1 text-aux text-ink-sub">여기 적은 방식이 비교의 기준이 돼요. 새 방식은 항상 이 방식과 같은 조건으로 견줘 봐요.</p>
      {wm.isPending || profile.isPending ? (
        <div className="mt-6">
          <Loading />
        </div>
      ) : (
        <MethodForm
          initial={toDraft(wm.data, profile.data?.task_types)}
          skills={env.data?.skills.map((s) => s.name) ?? []}
          onPrev={onPrev}
          onDone={onDone}
          onEditTasks={onEditTasks}
        />
      )}
    </>
  )
}

export function OnboardingPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const step = Math.min(Math.max(Number(params.get('step') ?? 1), 1), 4) - 1
  const fromSettings = params.get('from') === 'settings'
  const go = (n: number) => setParams({ step: String(n) })

  return (
    <>
      <Backdrop />
      <header className="flex items-center justify-between px-10 py-5">
        <Wordmark />
        <span className="text-aux text-ink-sub">설정은 나중에 [설정]에서 언제든 바꿀 수 있어요</span>
      </header>
      <main className="mx-auto max-w-[880px] px-4 pt-6 pb-16">
        {!fromSettings && <Steps current={step} />}
        {step === 0 && (
          <Gate>
            <AboutStep onNext={() => go(2)} />
          </Gate>
        )}
        {step === 1 && (
          <Gate>
            <ProjectStep onPrev={() => go(1)} onNext={() => go(3)} />
          </Gate>
        )}
        {step === 2 &&
          (fromSettings ? (
            <EnvStep
              onNext={() => {
                toast('환경을 저장했어요')
                void navigate('/settings')
              }}
              nextLabel="설정으로 돌아가기"
            />
          ) : (
            <EnvStep onPrev={() => go(2)} onNext={() => go(4)} nextLabel="다음: 작업 방식 등록" />
          ))}
        {step === 3 && (
          <MethodStep
            onPrev={() => go(3)}
            onEditTasks={() => go(1)}
            onDone={() => {
              toast('작업 방식을 등록했어요')
              void navigate('/')
            }}
          />
        )}
      </main>
      <Toaster />
    </>
  )
}
