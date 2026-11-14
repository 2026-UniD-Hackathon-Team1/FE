// 후보 수집 관리 (운영자): 지금 수집하기, 자동 수집 예약, 요청량.
// 서버 운영 토큰(X-Local-Token)이 있어야 쓸 수 있다. 로그인만으로는 403 operator_required.
// 백엔드: POST /api/catalog/sync, GET /api/catalog/jobs/{id}, GET /api/catalog/refresh, PUT /api/catalog/refresh/schedule
import { useState, type ReactNode } from 'react'
import { ArrowPathIcon, CheckCircleIcon, ClockIcon, ExclamationTriangleIcon, InformationCircleIcon, PlayIcon, XCircleIcon } from '@heroicons/react/24/outline'
import { ApiError, operatorEnabled } from '../api/client'
import { useRefreshState, useSaveSchedule, useStartSync, useSyncJob } from '../api/queries'
import { PageHeader } from '../components/PageHeader'
import { ErrorState, Loading, PermissionState } from '../components/States'
import { Button, ButtonLink } from '../components/ui/Button'
import { Card, InfoList } from '../components/ui/Card'
import { Checkbox, Field, Select, TextArea, TextInput } from '../components/ui/Field'
import { StatusPill, Tag } from '../components/ui/Tag'
import { toast } from '../components/ui/toastStore'
import { formatWhen } from '../lib/labels'
import type { RefreshSchedule, RefreshState, SyncJob } from '../types/catalog'

const REPO = /^[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9_.-]+$/
/** 한 줄에 하나씩, 빈 줄과 중복은 뺀다 */
const lines = (s: string) => [...new Set(s.split('\n').map((l) => l.trim()).filter(Boolean))]
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo))

const HOUR = 3600
const DAY = 86400
const every = (sec: number) => (sec % DAY === 0 ? `${sec / DAY}일마다` : sec % HOUR === 0 ? `${sec / HOUR}시간마다` : `${Math.round(sec / 60)}분마다`)
const resumeOptions = [300, 900, 1800, HOUR, 6 * HOUR, DAY]
const trackOptions = [HOUR, 6 * HOUR, 12 * HOUR, DAY, 3 * DAY, 7 * DAY]

const modeLabel: Record<string, string> = { resume: '이어서 수집', track: '등록된 저장소 확인', discovery: '새 저장소 검색' }
const jobLabel: Record<SyncJob['status'], string> = {
  queued: '대기 중',
  running: '수집 중',
  done: '완료',
  partial: '일부만 완료',
  failed: '실패',
  interrupted: '중단됨',
}
const repoLabel = { done: '완료', partial: '일부', failed: '실패', disabled: '꺼짐' } as const

/** 숫자 입력 한 칸 */
function NumberField({ label, help, value, min, max, onChange }: { label: string; help?: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <Field label={label} help={help ?? `${min}~${max}`}>
      {(id) => <TextInput id={id} type="number" min={min} max={max} value={value} onChange={(e) => onChange(clamp(Number(e.target.value), min, max))} />}
    </Field>
  )
}

function IntervalField({ label, value, options, onChange }: { label: string; value: number; options: number[]; onChange: (v: number) => void }) {
  const opts = options.includes(value) ? options : [...options, value].sort((a, b) => a - b)
  return (
    <Field label={label}>
      {(id) => (
        <Select id={id} value={value} onChange={(e) => onChange(Number(e.target.value))}>
          {opts.map((o) => (
            <option key={o} value={o}>
              {every(o)}
            </option>
          ))}
        </Select>
      )}
    </Field>
  )
}

/** 지금 수집하기 + 진행 상황 */
function SyncCard() {
  const start = useStartSync()
  const [jobId, setJobId] = useState<string | null>(null)
  const job = useSyncJob(jobId)
  const [repos, setRepos] = useState('')
  const [queries, setQueries] = useState('')
  const [resume, setResume] = useState(false)
  const [max, setMax] = useState(20)

  const repoList = lines(repos)
  const badRepo = repoList.find((r) => !REPO.test(r))
  const queryList = lines(queries)
  const running = !!job.data && (job.data.status === 'queued' || job.data.status === 'running')
  const valid = !badRepo && repoList.length <= 20 && queryList.length <= 5 && (repoList.length > 0 || queryList.length > 0 || resume)

  const submit = () =>
    start.mutate(
      {
        repositories: repoList.map((repository) => ({ repository, skill_folders: [] })),
        discovery_queries: queryList,
        discovery_limit: 5,
        batch_size: 5,
        resume_pending: resume,
        max_requests: max,
      },
      { onSuccess: (j) => setJobId(j.id), onError: (e) => toast(e.message) },
    )

  return (
    <Card title="지금 수집하기" aside="GitHub 공개 저장소에서 스킬을 찾아요">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="저장소" help={badRepo ? `"${badRepo}"는 owner/repo 모양이 아니에요` : '한 줄에 하나씩 owner/repo 모양으로, 20개까지'}>
          {(id) => <TextArea id={id} rows={4} value={repos} onChange={(e) => setRepos(e.target.value)} placeholder={'example-org/agent-skills\nsec-tools/review-skills'} aria-invalid={!!badRepo} />}
        </Field>
        <Field label="검색어" help="새 저장소를 찾을 검색어. 한 줄에 하나씩, 5개까지">
          {(id) => <TextArea id={id} rows={4} value={queries} onChange={(e) => setQueries(e.target.value)} placeholder="claude skill code review" />}
        </Field>
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-6">
        <div className="w-40">
          <NumberField label="이번 요청 수 한도" value={max} min={1} max={50} onChange={setMax} />
        </div>
        <div className="flex-1 pb-2">
          <Checkbox checked={resume} onChange={setResume} description="지난번에 다 못 받은 후보를 이어서 받아요">
            미완료 후보 이어서 수집
          </Checkbox>
        </div>
        <Button variant="primary" icon={PlayIcon} onClick={submit} disabled={!valid || start.isPending || running}>
          {running ? '수집 중…' : '수집 시작'}
        </Button>
      </div>

      {job.data && <JobProgress job={job.data} />}
      {job.isError && <p className="mt-4 text-aux font-bold">진행 상황을 불러오지 못했어요 · {job.error.message}</p>}
    </Card>
  )
}

function JobProgress({ job }: { job: SyncJob }) {
  const running = job.status === 'queued' || job.status === 'running'
  const pct = Math.round((job.request_count / Math.max(job.max_requests, 1)) * 100)
  const Icon = running ? ArrowPathIcon : job.status === 'done' ? CheckCircleIcon : job.status === 'partial' ? ExclamationTriangleIcon : XCircleIcon
  return (
    <section className="note mt-5 grid gap-3 px-5 py-4" aria-live="polite">
      <p className="flex flex-wrap items-center gap-2">
        <Icon aria-hidden className={`size-5 ${running ? 'animate-spin' : ''}`} />
        <span className="font-bold">{jobLabel[job.status]}</span>
        <span className="text-aux text-ink-sub">
          · 요청 {job.request_count}/{job.max_requests} · {formatWhen(job.created_at)} 시작
        </span>
      </p>
      {/* 진행 중에만: 이번 작업이 요청 한도를 얼마나 썼는지 */}
      {running && (
        <div className="h-1.5 overflow-hidden rounded-full bg-ink/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="요청 사용량">
          <div className="h-full rounded-full bg-black transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
      )}
      {job.error && <p className="text-aux font-bold">{job.error}</p>}
      {job.result.items.length > 0 && (
        <ul className="rows text-aux">
          {job.result.items.map((r) => (
            <li key={r.repository} className="flex flex-wrap items-center gap-3 py-2">
              <span className="min-w-0 flex-1 truncate font-bold">{r.repository}</span>
              <span className="text-ink-sub">
                새 버전 {r.new_versions}개
                {r.total_units ? ` · ${r.completed_units ?? 0}/${r.total_units}` : ''}
                {r.error && ` · ${r.error}`}
                {r.resume_required && ' · 이어서 수집 필요'}
              </span>
              <StatusPill>{repoLabel[r.status]}</StatusPill>
            </li>
          ))}
        </ul>
      )}
      {job.result.discovery_errors.map((d) => (
        <p key={d.query} className="text-aux">
          검색 "{d.query}" 실패 · {d.error}
          {d.retry_after && ` · ${formatWhen(d.retry_after)} 이후 다시`}
        </p>
      ))}
    </section>
  )
}

/** 자동 수집 예약 */
function ScheduleCard({ state }: { state: RefreshState }) {
  const save = useSaveSchedule()
  const [s, setS] = useState<RefreshSchedule>(state.schedule)
  const [queries, setQueries] = useState(state.schedule.discovery_queries.join('\n'))
  const set = <K extends keyof RefreshSchedule>(k: K, v: RefreshSchedule[K]) => setS({ ...s, [k]: v })
  const queryList = lines(queries)

  const submit = () =>
    save.mutate(
      { ...s, discovery_queries: queryList },
      { onSuccess: () => toast(s.enabled ? '예약을 저장했어요' : '예약을 껐어요'), onError: (e) => toast(e.message) },
    )

  return (
    <Card
      title="자동 수집 예약"
      aside={<StatusPill>{state.schedule.enabled ? '켜짐' : '꺼짐'}</StatusPill>}
    >
      <div className="grid gap-5">
        <Checkbox checked={s.enabled} onChange={(v) => set('enabled', v)} description="정해진 간격마다 서버가 알아서 후보를 수집해요">
          자동 수집 켜기
        </Checkbox>
        <div className="grid gap-4 md:grid-cols-3">
          <IntervalField label="이어서 수집" value={s.resume_interval_seconds} options={resumeOptions} onChange={(v) => set('resume_interval_seconds', v)} />
          <IntervalField label="등록된 저장소 확인" value={s.track_interval_seconds} options={trackOptions} onChange={(v) => set('track_interval_seconds', v)} />
          <IntervalField label="새 저장소 검색" value={s.discovery_interval_seconds} options={trackOptions} onChange={(v) => set('discovery_interval_seconds', v)} />
        </div>
        <Field label="검색어" help={queryList.length > 5 ? '검색어는 5개까지예요' : '새 저장소 검색에 쓸 검색어. 한 줄에 하나씩, 5개까지'}>
          {(id) => <TextArea id={id} rows={3} value={queries} onChange={(e) => setQueries(e.target.value)} aria-invalid={queryList.length > 5} />}
        </Field>
        <div className="grid gap-4 md:grid-cols-3">
          <NumberField label="검색당 저장소 수" value={s.discovery_limit} min={1} max={5} onChange={(v) => set('discovery_limit', v)} />
          <NumberField label="회차당 요청 수 한도" value={s.max_requests} min={5} max={20} onChange={(v) => set('max_requests', v)} />
          <NumberField label="저장소당 묶음 수" value={s.batch_size} min={1} max={20} onChange={(v) => set('batch_size', v)} />
        </div>
        {state.worker_required && (
          <p className="flex gap-2 rounded-lg bg-bg-sub px-4 py-3 text-aux">
            <InformationCircleIcon aria-hidden className="size-5 shrink-0" />
            예약을 켜도 서버에서 수집 워커(python -m backend.catalog.refresh --execute-network)가 돌아야 실제로 수집해요.
          </p>
        )}
        <div className="flex justify-end">
          <Button variant="primary" onClick={submit} disabled={save.isPending || queryList.length > 5}>
            예약 저장
          </Button>
        </div>
      </div>
    </Card>
  )
}

/** 요청량과 다음 실행 */
function UsageCard({ state }: { state: RefreshState }) {
  const runs = Object.entries(state.next_runs)
  const rows: [ReactNode, ReactNode][] = [
    ['최근 1시간', `${state.window_requests} / ${state.hourly_limit}회`],
    ['누적 요청', `${state.total_requests}회 · 작업 ${state.job_count}개`],
  ]
  if (state.next_allowed_at) rows.push(['다음 허용', `${formatWhen(state.next_allowed_at)}${state.blocked_reason ? ` · ${state.blocked_reason}` : ''}`])
  return (
    <Card title="요청량" aside={<span className="flex items-center gap-1.5"><ClockIcon aria-hidden className="size-4" />GitHub 요청 한도를 넘지 않게 관리해요</span>}>
      <div className="grid gap-x-10 gap-y-2 md:grid-cols-2">
        <InfoList items={rows} />
        <InfoList
          labelWidth="w-36"
          items={
            runs.length
              ? runs.map(([k, v]) => [modeLabel[k] ?? k, formatWhen(v)])
              : [['다음 실행', state.schedule.enabled ? '곧 정해져요' : '예약이 꺼져 있어요']]
          }
        />
      </div>
      {state.window_requests >= state.hourly_limit && (
        <p className="mt-3 flex items-center gap-2 text-aux font-bold">
          <Tag icon={ExclamationTriangleIcon} tone="outline">
            한도 도달
          </Tag>
          이번 1시간 요청을 다 썼어요. 잠시 뒤에 다시 수집해요.
        </p>
      )}
    </Card>
  )
}

export function CatalogAdminPage() {
  const state = useRefreshState(operatorEnabled)
  const crumbs = [{ label: '후보 둘러보기', to: '/discover' }, { label: '수집 관리' }]

  const denied = !operatorEnabled || (state.error instanceof ApiError && (state.error.status === 401 || state.error.status === 403))
  if (denied)
    return (
      <>
        <PageHeader crumbs={crumbs} title="수집 관리" />
        <PermissionState
          title="운영 권한이 필요해요"
          reason="후보 수집은 서버 전체에 영향을 줘서, 서버 운영 토큰(VITE_LOCAL_TOKEN)이 있는 개발 환경에서만 쓸 수 있어요."
          action={<ButtonLink to="/discover">후보 둘러보기로</ButtonLink>}
        />
      </>
    )

  return (
    <div className="max-w-[1040px]">
      <PageHeader crumbs={crumbs} title="수집 관리" description="서버가 공개 저장소에서 후보를 찾는 방법을 정해요. 모든 사용자에게 같이 적용돼요." />
      {state.isPending ? (
        <Loading />
      ) : state.isError ? (
        <ErrorState message={state.error.message} onRetry={() => void state.refetch()} />
      ) : (
        <div className="grid gap-4">
          <SyncCard />
          <UsageCard state={state.data} />
          <ScheduleCard key={JSON.stringify(state.data.schedule)} state={state.data} />
        </div>
      )}
    </div>
  )
}
