// S-01 온보딩 (FR-01, 02). 1) 나와 프로젝트(프로필·폴더) 2) 환경 확인 3) 작업 방식 등록
// ?from=settings 로 들어오면 설정에서 환경을 고치러 온 것이라 저장 뒤 설정으로 돌아간다.
import { useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  CommandLineIcon,
  CpuChipIcon,
  DocumentTextIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  FolderIcon,
  PencilSquareIcon,
  PlusIcon,
  PuzzlePieceIcon,
  QuestionMarkCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
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
import { ApiError, hasAuth } from '../api/client'
import { loginEnabled } from '../api/session'
import { Backdrop, Wordmark } from '../components/Brand'
import { ErrorState, Loading, PermissionState } from '../components/States'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Checkbox, Field, Select, TextInput } from '../components/ui/Field'
import { Tag } from '../components/ui/Tag'
import { Toaster } from '../components/ui/Toast'
import { toast } from '../components/ui/toastStore'
import { EnvItemModal } from '../features/environment/EnvItemModal'
import { WorkMethodEditor } from '../features/environment/WorkMethodEditor'
import { draftValid, fromDraft, toDraft, type MethodDraft } from '../features/environment/methodDraft'
import { ScopeModal } from '../features/project/ScopeModal'
import { accessScopeLabel, formatWhen, goalLabel, languageLabel, otherTaskOptions, roleOptions, taskTypeLabel } from '../lib/labels'
import type { EnvItemInput } from '../types/api'
import type { TaskType } from '../types/domain'

const STEPS = ['나에 대해', '프로젝트 연결', '환경 확인', '작업 방식 등록']

/** 환경 항목 종류 아이콘 (Figma 18:660) */
const kindIcon = { tool: CommandLineIcon, model: CpuChipIcon, skill: PuzzlePieceIcon, config: DocumentTextIcon } as const
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

/** 아래 버튼 줄. extra가 있으면 왼쪽에 두고 이전·다음은 오른쪽에 모은다 (Figma 18:660) */
function Footer({ onPrev, onCancel, next, extra }: { onPrev?: () => void; onCancel?: () => void; next: React.ReactNode; extra?: React.ReactNode }) {
  const prev = (onPrev || onCancel) && (
    <Button icon={ArrowLeftIcon} onClick={onPrev ?? onCancel}>
      {onPrev ? '이전' : '취소'}
    </Button>
  )
  return (
    <div className="mt-8 flex items-center justify-between gap-2">
      {extra ?? prev ?? <span />}
      <div className="flex items-center gap-2">
        {extra && prev}
        {next}
      </div>
    </div>
  )
}

// ── 연결 프로그램 블록 ───────────────────────────────────

function CopyLine({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 note py-1.5 pr-1.5 pl-4">
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
      <div className="flex items-center gap-3 note px-4 py-3">
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

/** 온보딩 선택 칩 (Figma 84:1320, 97:1157). 준비 중 작업은 작은 태그, 직접 추가한 것은 × 로 뺀다 */
function PickChip({
  selected,
  onClick,
  preparing,
  onRemove,
  children,
}: {
  selected: boolean
  onClick: () => void
  preparing?: boolean
  onRemove?: () => void
  children: React.ReactNode
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border text-[15px] leading-[23px] transition-colors duration-150 ${
        selected ? 'border-ink bg-ink font-bold text-white' : 'border-ink/30 bg-white font-medium hover:bg-bg-sub'
      }`}
    >
      <button type="button" aria-pressed={selected} onClick={onClick} className={`flex items-center gap-1.5 py-[7px] pl-3.5 ${preparing || onRemove ? 'pr-0' : 'pr-3.5'}`}>
        {children}
      </button>
      {preparing && (
        <span className={`mr-2 rounded-full px-1.5 py-px text-[11px] leading-[17px] font-medium ${selected ? 'bg-white/20 text-white' : 'bg-ink/8 text-ink-sub'}`}>
          비교 준비 중
        </span>
      )}
      {onRemove && (
        <button type="button" aria-label={`${children} 빼기`} onClick={onRemove} className="mr-2.5 -ml-0.5">
          <XMarkIcon aria-hidden className="size-3.5" />
        </button>
      )}
    </span>
  )
}

/** "+ 직접 추가" 칩. 누르면 입력 칸이 되고 Enter로 추가, Esc로 취소 (Figma 98:1157) */
function AddChip({ onAdd, onEditingChange }: { onAdd: (v: string) => void; onEditingChange?: (on: boolean) => void }) {
  const [editing, setEditing] = useState(false)
  const [v, setV] = useState('')
  const set = (on: boolean) => {
    setEditing(on)
    onEditingChange?.(on)
    if (!on) setV('')
  }
  const commit = () => {
    if (v.trim()) onAdd(v.trim())
    set(false)
  }
  if (!editing)
    return (
      <button
        type="button"
        onClick={() => set(true)}
        className="inline-flex items-center gap-1 rounded-full border border-dashed border-ink/45 bg-white px-3.5 py-[7px] text-[15px] leading-[23px] font-medium hover:bg-bg-sub"
      >
        <PlusIcon aria-hidden className="size-4" />
        직접 추가
      </button>
    )
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-ink bg-white py-1 pr-2 pl-3.5">
      <input
        autoFocus
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit()
          }
          if (e.key === 'Escape') set(false)
        }}
        aria-label="직접 추가할 항목"
        className="w-28 bg-transparent text-[15px] leading-[23px] outline-none"
      />
      <button type="button" onClick={commit} className="rounded-full bg-black px-2.5 py-0.5 text-caption font-bold text-white">
        추가
      </button>
      <button type="button" aria-label="취소" onClick={() => set(false)}>
        <XMarkIcon aria-hidden className="size-3.5" />
      </button>
    </span>
  )
}

function AboutStep({ onNext }: { onNext: () => void }) {
  const profile = useProfile()
  const save = useSaveProfile()
  const p = profile.data
  const [role, setRole] = useState(p?.role ?? roleOptions[0])
  const [lang, setLang] = useState(p?.primary_language ?? 'python')
  const [tasks, setTasks] = useState<TaskType[]>(p?.task_types ?? ['code_review', 'test_writing'])
  const [goals, setGoals] = useState<string[]>(p?.goals ?? [])
  const [others, setOthers] = useState<string[]>(p?.other_tasks ?? [])
  /** 직접 추가한 항목 (미리 준비된 목록에 없는 것) */
  const customOthers = others.filter((o) => !otherTaskOptions.includes(o))
  const customGoals = goals.filter((g) => !(g in goalLabel))
  const [addingTask, setAddingTask] = useState(false)

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
          <p className="-mt-1.5 text-aux text-ink-sub">하나 이상 골라 주세요. 코드 리뷰·테스트 작성은 내 작업으로 비교까지 할 수 있고, 나머지는 관련 소식만 먼저 알려 드려요.</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(taskTypeLabel) as TaskType[]).map((t) => (
              <PickChip key={t} selected={tasks.includes(t)} onClick={() => setTasks(flip(tasks, t, !tasks.includes(t)))}>
                {taskTypeLabel[t]}
              </PickChip>
            ))}
            {otherTaskOptions.map((o) => (
              <PickChip key={o} preparing selected={others.includes(o)} onClick={() => setOthers(flip(others, o, !others.includes(o)))}>
                {o}
              </PickChip>
            ))}
            {customOthers.map((o) => (
              <PickChip key={o} selected onClick={() => setOthers(flip(others, o, false))} onRemove={() => setOthers(flip(others, o, false))}>
                {o}
              </PickChip>
            ))}
            <AddChip onAdd={(v) => setOthers(flip(others, v, true))} onEditingChange={setAddingTask} />
          </div>
          {addingTask && <p className="text-caption text-ink-sub">Enter로 추가하고, Esc로 취소해요. 직접 추가한 작업은 관련 소식만 알려 드려요(비교는 준비 중).</p>}
        </div>
        <div className="grid gap-2.5">
          <h2 className="text-title3">요즘 신경 쓰는 것</h2>
          <p className="-mt-1.5 text-aux text-ink-sub">고르지 않아도 돼요. 고르면 관련 변화를 먼저 보여 드려요.</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(goalLabel).map(([k, v]) => (
              <PickChip key={k} selected={goals.includes(k)} onClick={() => setGoals(flip(goals, k, !goals.includes(k)))}>
                {v}
              </PickChip>
            ))}
            {customGoals.map((g) => (
              <PickChip key={g} selected onClick={() => setGoals(flip(goals, g, false))} onRemove={() => setGoals(flip(goals, g, false))}>
                {g}
              </PickChip>
            ))}
            <AddChip onAdd={(v) => setGoals(flip(goals, v, true))} />
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
            onClick={() => save.mutate({ role, primary_language: lang, task_types: tasks, goals, other_tasks: others }, { onSuccess: onNext })}
          >
            {save.isPending ? '저장하는 중…' : '다음: 프로젝트 연결'}
          </Button>
        }
      />
    </>
  )
}

// ── 2단계: 프로젝트 연결 ─────────────────────────────────

function ProjectStep({ onNext }: { onNext: () => void }) {
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
        <Field label="프로젝트 폴더">
          {(id) => (
            <div className="relative">
              <TextInput id={id} value={dir} onChange={(e) => setDir(e.target.value)} placeholder="~/work/my-project" className="pr-28" />
              <Button
                size="sm"
                className="absolute top-1/2 right-1.5 -translate-y-1/2"
                onClick={() => {
                  const el = document.getElementById(id) as HTMLInputElement | null
                  el?.focus()
                  el?.select()
                }}
              >
                폴더 바꾸기
              </Button>
            </div>
          )}
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

function EnvStep({
  onPrev,
  onCancel,
  onNext,
  nextLabel,
  title = '이 프로젝트의 AI 환경을 확인해 주세요',
}: {
  onPrev?: () => void
  onCancel?: () => void
  onNext: () => void
  nextLabel: string
  title?: string
}) {
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
      <h1 className="text-title1">{title}</h1>
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
            <div className="glass-sub flex flex-wrap items-center gap-3 px-6 py-4">
              <FolderIcon aria-hidden className="size-5 shrink-0" />
              <span className="flex-1">
                읽은 범위 · {project.data?.work_dir} <span className="text-aux text-ink-sub">(읽기만 했고, 아무것도 바꾸지 않았어요)</span>
              </span>
              <button type="button" className="font-bold underline underline-offset-4 hover:text-ink-sub" onClick={() => setScopeOpen(true)}>
                범위 바꾸기
              </button>
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
                      <td className="py-3 font-bold">
                        <span className="flex items-center gap-2">
                          {(() => {
                            const I = kindIcon[r.kind]
                            return <I aria-hidden className="size-[18px] shrink-0" />
                          })()}
                          {r.name}
                        </span>
                      </td>
                      <td className="py-3">{r.kindLabel}</td>
                      <td className="py-3">
                        {r.kind === 'config'
                          ? '—'
                          : (r.version ?? (
                              <Tag icon={QuestionMarkCircleIcon} tone="outline">
                                미확인
                              </Tag>
                            ))}
                      </td>
                      <td className="py-3">{r.source ?? '—'}</td>
                      <td className="py-3">{formatWhen(r.checked)}</td>
                      <td className="px-5 py-3 text-right">
                        <Button size="sm" icon={PencilSquareIcon} onClick={() => setModal({ initial: input(r), edit: true })}>
                          {r.version || r.kind === 'config' ? '수정' : '직접 입력'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
            {e?.unreadable_files?.map((f) => (
              <div key={f} className="glass-sub flex items-center gap-3 px-6 py-4 text-aux">
                <ExclamationCircleIcon aria-hidden className="size-5" />
                <span className="flex-1">{f} 파일은 읽을 수 없는 형식이에요. 필요한 내용만 직접 입력해 주세요.</span>
                <Button
                  size="sm"
                  icon={PencilSquareIcon}
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
          </>
        )}
      </div>
      <Footer
        onPrev={onPrev}
        onCancel={onCancel}
        extra={
          env.isSuccess ? (
            <Button icon={PlusIcon} variant="ghost" onClick={() => setModal({})}>
              항목 직접 추가
            </Button>
          ) : undefined
        }
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
  // 실제 서버인데 계정이 없으면 시작 화면부터 (목 서버는 그대로)
  const needsStart = loginEnabled && !hasAuth()
  const step = Math.min(Math.max(Number(params.get('step') ?? 1), 1), 4) - 1
  /** 설정이나 홈에서 환경을 고치러 들어온 경우: 단계 표시 없이 저장 후 돌아간다 (다시 확인 결과 팝업은 띄우지 않는다) */
  const from = params.get('from')
  const editing = from === 'settings' || from === 'home'
  const back = from === 'home' ? { to: '/', label: '저장하고 홈으로' } : { to: '/settings', label: '저장하고 설정으로' }
  const go = (n: number) => setParams({ step: String(n) })

  if (needsStart) return <Navigate to="/login" replace />
  return (
    <>
      <Backdrop />
      <header className="flex h-16 items-center justify-between border-b border-ink/12 px-10">
        <Wordmark />
        {editing ? (
          // 설정·홈에서 고치러 온 경우: 어디서 왔는지 보여 준다 (Figma 91:1066)
          <span className="text-aux text-ink-sub">{from === 'home' ? '홈' : '설정'} › 내 환경 수정</span>
        ) : (
          <span className="text-aux text-ink-sub">설정은 나중에 [설정]에서 언제든 바꿀 수 있어요</span>
        )}
      </header>
      <main className="mx-auto max-w-[880px] px-4 pt-6 pb-16">
        {!editing && <Steps current={step} />}
        {step === 0 && (
          <Gate>
            <AboutStep onNext={() => go(2)} />
          </Gate>
        )}
        {step === 1 && (
          <Gate>
            <ProjectStep onNext={() => go(3)} />
          </Gate>
        )}
        {step === 2 &&
          (editing ? (
            <EnvStep
              title="내 환경 수정"
              onCancel={() => void navigate(back.to)}
              onNext={() => {
                toast('환경을 저장했어요. 바뀐 환경에 맞춰 추천을 다시 골랐어요')
                void navigate(back.to)
              }}
              nextLabel={back.label}
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
