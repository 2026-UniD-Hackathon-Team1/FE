// 백엔드 응답 → 화면 데이터 변환. 백엔드 모양이 바뀌면 여기만 고친다.
import type {
  Candidate,
  Change,
  ChangeNature,
  ChangeType,
  Comparison,
  ComparisonResult,
  ComparisonStatus,
  Compatibility,
  DecisionAction,
  DecisionLog,
  EnvItem,
  Environment,
  EvidenceKind,
  Finding,
  FindingVerification,
  Impact,
  Match,
  MatchStatus,
  MetricValue,
  Permission,
  SupportLevel,
  Switch,
  SwitchChange,
  TaskType,
  Verdict,
  WorkMethod,
} from '../../types/domain'
import type {
  ActiveComparison,
  AgentInfo,
  ChangeDetail,
  ComparisonPrep,
  EnvDiff,
  EnvItemInput,
  InputOption,
  MatchedChange,
  Profile,
  ProfileInput,
  ProjectDetail,
  SwitchPreview,
  WorkMethodInput,
} from '../../types/api'
import type {
  BApplyPreview,
  BApplyResult,
  BCandidate,
  BChangeType,
  BCompatibility,
  BComparison,
  BComparisonStatus,
  BComparisonSummary,
  BDeclaredPermission,
  BEnvItemInput,
  BEnvironment,
  BEventType,
  BAgent,
  BHistoryEvent,
  BInputSuggestion,
  BLatestComparison,
  BProfile,
  BProfileInput,
  BRecommendation,
  BRecommendationStatus,
  BRunInputResult,
  BStorage,
  BSupport,
  BTask,
  BVerdict,
  BVerification,
  BWorkMethod,
  BWorkMethodInput,
} from './types'

// ── 값 대응표 ───────────────────────────────────────────

export const toTask = (t: BTask): TaskType => (t === 'test_generation' ? 'test_writing' : 'code_review')
export const fromTask = (t: TaskType): BTask => (t === 'test_writing' ? 'test_generation' : 'code_review')

const supportMap: Record<BSupport, SupportLevel> = {
  information_only: 'info_only',
  comparable: 'comparable',
  applicable: 'switchable',
}
const verdictMap: Record<BVerdict, Verdict> = {
  candidate: 'candidate_better',
  baseline: 'baseline_better',
  tradeoff: 'depends_on_criteria',
  tie: 'no_difference',
  abstain: 'inconclusive',
}
const compatMap: Record<BCompatibility, Compatibility> = {
  confirmed: 'runnable',
  unknown: 'unknown',
  incompatible: 'unsupported',
}
const recStatusMap: Record<BRecommendationStatus, MatchStatus> = {
  new: 'new',
  snoozed: 'snoozed',
  dismissed: 'dismissed',
  compared: 'compared',
  kept: 'kept',
  applied: 'switched',
}
export const toVerification = (v: BVerification): FindingVerification => (v === 'unverified' ? 'needs_check' : v)
export const fromVerification = (v: FindingVerification): BVerification => (v === 'needs_check' ? 'unverified' : v)

function changeType(t: BChangeType | undefined, assetKind?: string): ChangeType {
  if (t === 'deprecated') return 'deprecated'
  if (t === 'updated') return assetKind === 'feature' ? 'feature_change' : 'skill_update'
  return assetKind === 'feature' ? 'feature_change' : 'new_skill'
}
const nature = (t: BChangeType | undefined): ChangeNature => (t === 'deprecated' ? 'action_required' : 'improvement')
/** 추천 점수(작업 관련성, 설계서 6.1)를 영향도로. 성능 점수가 아니다 */
const impact = (score: number | undefined): Impact => (score === undefined ? 'medium' : score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low')

// 필수 조건·보조 항목: 화면은 한국어 문장, 백엔드는 코드
const CHECKS: [string, string][] = [
  ['known_regressions_not_missed', '확인된 결함을 놓치지 않기'],
  ['project_rules_followed', '프로젝트 규칙 지키기'],
  ['generated_tests_run', '생성한 테스트가 실행되기'],
]
const PREFS: [string, string][] = [
  ['time', '실행 시간'],
  ['cost', '비용'],
  ['false_positives', '오탐 수'],
]
const label = (pairs: [string, string][], code: string) => pairs.find(([c]) => c === code)?.[1] ?? code
const code = (pairs: [string, string][], text: string) => pairs.find(([, t]) => t === text)?.[0] ?? text

// ── 상태·프로필·환경 ────────────────────────────────────

export const toAgent = (a: BAgent | null): AgentInfo => ({
  status: a?.status ?? 'disconnected',
  device_name: a?.device_name ?? null,
  agent_version: a?.agent_version ?? null,
  runner_version: a?.codex_version ?? null,
  runner_ready: a?.codex_ready ?? false,
  last_seen_at: a?.last_seen_at ?? null,
})

export const toProfile = (p: BProfile): Profile => ({
  role: p.role,
  primary_language: p.primary_language,
  task_types: p.task_types.map(toTask),
  goals: p.goals,
  // 백엔드 preferences는 값으로 글자·숫자만 받아서 쉼표로 이어 저장한다
  other_tasks: typeof p.preferences?.other_tasks === 'string' ? p.preferences.other_tasks.split(',').filter(Boolean) : [],
  version: p.profile_version,
})
export const fromProfile = (p: ProfileInput): BProfileInput => ({
  role: p.role,
  primary_language: p.primary_language,
  task_types: p.task_types.map(fromTask),
  goals: p.goals,
  preferences: p.other_tasks?.length ? { other_tasks: p.other_tasks.map((t) => t.replaceAll(',', ' ')).join(',') } : {},
})

export function toEnvironment(e: BEnvironment): Environment {
  const item = (name: string, version: string | null, source: string | null, excluded = false): EnvItem => ({
    name,
    version,
    source,
    last_checked_at: e.scanned_at,
    excluded,
  })
  const files = e.settings_files ?? []
  return {
    id: e.id ?? e.environment_id ?? e.scan_root,
    project_id: e.scan_root,
    tool: item('Codex CLI', e.runner === 'unknown' ? null : e.runner_version, '설치된 CLI'),
    model: item('사용 모델', e.model_id || null, 'Codex 설정'),
    skills: e.installed_skills.map((s) => item(s.name, s.version, s.source ?? s.path ?? null, !!s.excluded)),
    config_files: files.filter((f) => f.readable).map((f) => ({ path: f.path, summary: f.summary, excluded: f.excluded })),
    unreadable_files: [...files.filter((f) => !f.readable).map((f) => f.path), ...(e.excluded_paths ?? []).map((x) => x.path)],
    last_checked_at: e.scanned_at,
  }
}

const envKind: Record<EnvItemInput['kind'], BEnvItemInput['kind']> = {
  tool: 'runner',
  model: 'model',
  skill: 'skill',
  config: 'settings_file',
}
export const fromEnvItem = (i: EnvItemInput): BEnvItemInput => ({
  ...i,
  kind: envKind[i.kind],
})

/** 다시 스캔한 결과와 이전 스캔을 비교해 바뀐 항목만 (FR-03) */
export function envDiff(before: BEnvironment | null, after: BEnvironment): EnvDiff[] {
  if (!before) return []
  const out: EnvDiff[] = []
  if (before.runner_version !== after.runner_version)
    out.push({
      label: 'Codex CLI',
      before: before.runner_version ?? '미확인',
      after: after.runner_version ?? '미확인',
    })
  if (before.model_id !== after.model_id)
    out.push({
      label: '사용 모델',
      before: before.model_id ?? '미확인',
      after: after.model_id ?? '미확인',
    })
  const prev = new Map(before.installed_skills.map((s) => [s.name, s.version]))
  for (const s of after.installed_skills) {
    if (!prev.has(s.name))
      out.push({
        label: `${s.name} 스킬`,
        before: '없음',
        after: `${s.version ?? '미확인'} 새로 설치`,
      })
    else if (prev.get(s.name) !== s.version)
      out.push({
        label: `${s.name} 스킬`,
        before: prev.get(s.name) ?? '미확인',
        after: s.version ?? '미확인',
      })
  }
  for (const s of before.installed_skills)
    if (!after.installed_skills.some((x) => x.name === s.name))
      out.push({
        label: `${s.name} 스킬`,
        before: s.version ?? '미확인',
        after: '삭제됨',
      })
  return out
}

export function toProject(e: BEnvironment | null, s: BStorage | null, h: BAgent | null): ProjectDetail {
  const root = e?.scan_root ?? ''
  return {
    id: e?.id ?? e?.environment_id ?? 'local',
    user_id: 'local',
    name: root.split('/').filter(Boolean).pop() ?? '연결 안 됨',
    work_dir: root,
    access_scope: e?.allowed_scopes ?? e?.scopes ?? ['config', 'skills', 'code'],
    connection: h?.status === 'connected' ? 'connected' : 'disconnected',
    comparison_count: s?.comparison_count ?? 0,
    backups: (s?.backups ?? []).map((b) => ({
      switch_id: b.apply_id,
      title: b.title,
      taken_at: b.created_at,
      applied: b.applied,
    })),
  }
}

export function toWorkMethod(m: BWorkMethod): WorkMethod {
  return {
    id: m.method_id,
    project_id: 'local',
    task_type: toTask(m.task_type),
    prompt: m.prompt_text || null,
    skill: m.skill_name ?? null,
    output_format: m.output_format ?? null,
    test_command: m.test_command ?? null,
    required_conditions: m.required_checks.map((c) => label(CHECKS, c)),
    secondary_metrics: Object.entries(m.scoring_preferences)
      .filter(([, v]) => v === 'secondary')
      .map(([k]) => label(PREFS, k)),
    version: m.version,
    created_at: m.created_at,
  }
}
/** 프롬프트를 비워 두면 기본 프롬프트로 저장한다 (서버는 빈 프롬프트를 받지 않는다) */
const DEFAULT_PROMPT: Record<string, string> = {
  code_review: '변경된 코드를 리뷰해 줘. 버그, 보안 문제, 예외 처리 누락을 파일과 줄 번호, 이유와 함께 알려 줘.',
  test_generation: '변경된 코드에 필요한 테스트를 작성해 줘. 경계값과 실패 경우를 포함해 줘.',
}

/** 서버는 정해진 필드 밖의 값을 받지 않는다(extra=forbid). 스킬·결과 형식·테스트 명령은 화면에서만 쓴다 */
export function fromWorkMethod(m: WorkMethodInput): BWorkMethodInput {
  const task = fromTask(m.task_type)
  return {
    task_type: task,
    prompt_text: m.prompt?.trim() || DEFAULT_PROMPT[task] || DEFAULT_PROMPT.code_review,
    required_checks: m.required_conditions.map((t) => code(CHECKS, t)),
    scoring_preferences: Object.fromEntries([['correctness', 'required'], ...m.secondary_metrics.map((t) => [code(PREFS, t), 'secondary'])]),
  }
}

// ── 추천·후보 ────────────────────────────────────────────

/** 배포 서버는 끝난 비교의 id·상태·사용자 선택만 준다. 끝나지 않았으면 요약을 띄우지 않는다 */
const latest = (l: BLatestComparison | null | undefined): MatchedChange['latest_comparison'] =>
  l && (!l.status || l.status === 'done')
    ? {
        id: l.comparison_id,
        verdict: verdictMap[l.verdict ?? 'abstain'],
        highlights: l.highlights ?? [],
        executed_at: l.completed_at ?? '',
        run_count: l.runs_per_arm ?? 1,
      }
    : null

function toMatch(
  id: string,
  changeId: string,
  r: {
    change_type?: BChangeType
    score?: number
    status?: BRecommendationStatus
    snoozed_until?: string | null
    related_reasons: string[]
  },
): Match {
  return {
    id,
    change_id: changeId,
    environment_id: 'local',
    impact: impact(r.score),
    nature: nature(r.change_type),
    reason: r.related_reasons.join(' · '),
    status: recStatusMap[r.status ?? 'new'],
    snoozed_until: r.snoozed_until ?? null,
  }
}

export function toMatchedChange(r: BRecommendation): MatchedChange {
  const change: Change = {
    id: r.candidate_version_id,
    title: r.title,
    change_type: changeType(r.change_type),
    target_tool: 'Codex CLI',
    target_versions: '',
    task_types: (r.task_types ?? []).map(toTask),
    replaces: [],
    summary: '',
    claimed_benefit: null,
    sources: [{ url: r.source_url, kind: 'registry' }],
    published_at: '',
    verified_at: '',
    impact_hint: impact(r.score),
  }
  return {
    match: toMatch(r.recommendation_id, r.candidate_version_id, r),
    change,
    candidate_id: r.support_level === 'information_only' ? null : r.candidate_version_id,
    support_level: supportMap[r.support_level],
    latest_comparison: latest(r.latest_comparison),
  }
}

const toPermission = (p: BDeclaredPermission): Permission => ({
  kind: p.kind,
  description: p.description,
  is_additional: !!p.additional,
})

/** 화면에 쓰는 후보 이름. 목 서버는 asset.display_name, 배포 서버는 title */
export const candidateName = (c: BCandidate) => c.asset?.display_name ?? c.title

export function toCandidate(c: BCandidate): Candidate {
  return {
    id: c.candidate_version_id,
    change_id: c.candidate_version_id,
    pinned_version: c.revision,
    support_level: supportMap[c.support_level],
    status: 'active',
    provenance: c.provenance === 'known_author' ? 'community' : (c.provenance ?? 'unverified'),
    repository_url: c.source_url ?? '',
    author: c.maintainer.author ?? '확인 불가',
    license: c.maintainer.license ?? null,
    last_maintained_at: c.maintainer.last_updated_at ?? null,
    permissions: c.permissions.declared.map(toPermission),
    compatibility: compatMap[c.compatibility],
    required_setup: [],
    risk_signals: c.risk_signals,
  }
}

export function toChangeDetail(c: BCandidate, rec: BRecommendation | undefined): ChangeDetail {
  const kind = c.asset?.kind ?? c.kind
  const change: Change = {
    id: c.candidate_version_id,
    title: c.title,
    change_type: changeType(c.change_type ?? (rec?.change_type as BChangeType | undefined), kind),
    target_tool: 'Codex CLI',
    target_versions: '',
    task_types: c.task_types.map((t) => toTask(t as BTask)),
    replaces: c.replaces ? [c.replaces] : [],
    summary: c.summary ?? '',
    claimed_benefit: c.claimed_benefit ?? null,
    sources: [{ url: c.source_url ?? rec?.source_url ?? '', kind: 'registry' }],
    published_at: c.published_at ?? c.first_seen_at ?? '',
    verified_at: c.verified_source_at ?? '',
    impact_hint: impact(rec?.score),
  }
  return {
    match: toMatch(c.recommendation_id ?? rec?.recommendation_id ?? '', c.candidate_version_id, {
      ...rec,
      change_type: c.change_type ?? (rec?.change_type as BChangeType | undefined),
      related_reasons: c.related_reasons.length ? c.related_reasons : (rec?.related_reasons ?? []),
    }),
    change,
    candidates: [toCandidate(c)],
    latest_comparison: latest(c.latest_comparison ?? rec?.latest_comparison),
  }
}

// ── 비교 ────────────────────────────────────────────────

/** 지표 키 → 화면 이름·단위·근거 종류 (설계서 9.3·9.4). 측정값 / 사용자 확인을 구분한다 (P6) */
const METRICS: Record<BTask, [string, string, string, EvidenceKind][]> = {
  code_review: [
    ['raised', '제기한 문제', '건', 'measured'],
    ['confirmed', '확인된 문제', '건', 'user_verified'],
    ['false_positive', '확인된 오탐', '건', 'user_verified'],
    ['missed', '놓친 문제', '건', 'measured'],
    ['duration', '실행 시간', '초', 'measured'],
    ['cost', '비용', '달러', 'measured'],
  ],
  test_generation: [
    ['runnable', '실행 가능성', '개', 'measured'],
    ['normal', '정상 동작 검증', '개', 'measured'],
    ['defects', '결함 탐지', '건', 'measured'],
    ['rules', '프로젝트 규칙 준수', '개', 'user_verified'],
    ['duration', '실행 시간', '초', 'measured'],
    ['cost', '비용', '달러', 'measured'],
  ],
}

function comparisonStatus(c: BComparison): ComparisonStatus {
  const s: BComparisonStatus = c.status
  if (s === 'interrupted') return 'failed'
  if (s !== 'running') return s
  const base = c.runs.find((r) => r.arm === 'baseline')
  return base && base.status === 'completed' ? 'running_candidate' : 'running_baseline'
}

/** 지표 값: 목 서버는 { value, total }, 배포 서버는 숫자일 수 있다 */
const metricOf = (m: BRunInputResult['metrics'], key: string) => {
  const v = m?.[key]
  return typeof v === 'number' ? { value: v, total: null } : { value: v?.value ?? null, total: v?.total ?? null }
}

const severityLabel = { high: '심각', medium: '보통', low: '사소' } as const

/** 연결 프로그램은 PC의 임시 작업 폴더 전체 경로를 준다 (…/baseline/workspace/app.py) → 프로젝트 기준 경로만 남긴다 */
const workspacePath = (p: string) => {
  const i = p.lastIndexOf('/workspace/')
  return i >= 0 ? p.slice(i + '/workspace/'.length) : p
}

export function toComparison(c: BComparison, candidate?: BCandidate): Comparison {
  const task: BTask = c.task_type ?? (c.inputs[0]?.task_type === 'test_generation' ? 'test_generation' : 'code_review')
  const defs = METRICS[task]
  const inputLabel = (i: BComparison['inputs'][number]) => i.label ?? (i.relative_paths?.length ? i.relative_paths.join(', ') : i.input_id)
  const results: ComparisonResult[] = c.runs.flatMap((run) =>
    c.inputs.map((input) => {
      const runId = run.run_id ?? `${c.comparison_id}_${run.arm}`
      const r = run.inputs.find((x) => x.input_id === input.input_id)
      const id = `${runId}:${input.input_id}`
      const ok = r?.status === 'completed'
      const raw = r?.result?.findings ?? []
      const metrics: MetricValue[] = defs.map(([key, lbl, unit, evidence]) => {
        const m = metricOf(r?.metrics, key)
        // 배포 서버가 지적 수를 따로 주지 않으면 구조화된 결과의 지적 개수로 센다
        const value = key === 'duration' ? (r?.seconds ?? null) : key === 'raised' && m.value === null && r?.result ? raw.length : m.value
        return { key, label: lbl, unit, basis: inputLabel(input), value: ok ? value : null, total: m.total, evidence }
      })
      // 목 서버: 검증 상태가 붙은 지적 목록 / 배포 서버: 실행 결과의 지적 목록 (검증 전)
      // 배포 서버는 맨 위 findings를 빈 배열로 보낸다 → 실행 결과의 지적을 쓴다
      const findings: Finding[] = c.findings?.length
        ? c.findings
            .filter((f) => f.run_id === runId && f.input_id === input.input_id)
            .map((f) => ({
              id: f.finding_id,
              comparison_result_id: id,
              location: f.path ? `${f.path}${f.line_number ? `:${f.line_number}` : ''}` : '위치 없음',
              content: f.description,
              group_id: f.canonical_group,
              severity: null,
              verification: toVerification(f.verification),
              user_note: f.user_note,
              history: f.history.map((h) => ({ at: h.at, from: toVerification(h.from), to: toVerification(h.to), note: h.note })),
            }))
        : raw.map((f, i) => ({
            id: `${id}:${i}`,
            comparison_result_id: id,
            location: `${workspacePath(f.path)}:${f.line}`,
            content: f.suggested_fix ? `${f.issue} (고치는 방법: ${f.suggested_fix})` : f.issue,
            group_id: null,
            severity: severityLabel[f.severity] ?? f.severity,
            verification: 'needs_check',
            user_note: null,
            history: [],
          }))
      return {
        id,
        comparison_id: c.comparison_id,
        input_id: input.input_id,
        method: run.arm,
        raw_output: r?.output_text ?? r?.result?.summary ?? '',
        metrics,
        duration_ms: r?.seconds != null ? r.seconds * 1000 : null,
        usage: {
          tokens: run.tokens ?? null,
          cost: run.cost_usd != null ? `약 ${run.cost_usd.toFixed(2)}달러` : null,
          cost_kind: run.cost_kind ?? null,
        },
        run_status: ok ? 'success' : r?.status === 'timeout' ? 'timeout' : 'failed',
        failure_reason: ok
          ? null
          : (r?.failure_message ??
            r?.failure_code ??
            run.failure_message ??
            run.failure_code ??
            (run.status === 'queued' || run.status === 'running' ? '아직 실행 전' : '원인 확인 불가')),
        findings,
      }
    }),
  )
  return {
    id: c.comparison_id,
    match_id: c.recommendation_id ?? '',
    candidate_id: c.candidate_version_id,
    inputs: c.inputs.map((i) => ({
      id: i.input_id,
      label: inputLabel(i),
      ref: i.ref ?? '',
      content_hash: i.manifest_sha256 ?? i.input_sha256 ?? '',
      is_example: !!i.is_fixture,
    })),
    conditions: {
      model_id: c.plan.model_id,
      baseline_label: c.baseline_label,
      candidate_label: c.candidate_label,
      time_limit_sec: c.plan.timeout_seconds ?? 180,
      estimated_cost: c.plan.max_estimated_cost_usd != null ? `약 ${c.plan.max_estimated_cost_usd.toFixed(2)}달러 이하` : null,
    },
    status: comparisonStatus(c),
    verdict: c.verdict ? verdictMap[c.verdict] : null,
    verdict_reason: c.verdict_reason ?? null,
    verdict_rule_version: c.rubric_version,
    run_count: c.runs_per_arm,
    executed_at: c.completed_at ?? c.created_at ?? '',
    is_prerecorded: c.is_prerecorded,
    results,
    candidate: candidate ? toCandidate(candidate) : undefined,
    change: c.change_title ? { id: c.candidate_version_id, title: c.change_title } : undefined,
    ai_note: c.llm_judgment ? { summary: c.llm_judgment.summary, next_check: c.llm_judgment.next_check } : null,
    method: c.method_id && c.method_version ? { id: c.method_id, version: c.method_version } : null,
  }
}

export const toActive = (c: BComparisonSummary): ActiveComparison => ({
  id: c.comparison_id,
  change_title: c.change_title,
  candidate_label: c.candidate_label,
  status: c.status === 'running' ? 'running_baseline' : c.status === 'interrupted' ? 'failed' : c.status,
  started_at: c.created_at,
})

const suggestionKind: Record<BInputSuggestion['kind'], InputOption['kind']> = {
  diff: 'pr',
  files: 'files',
  fixture: 'example',
}

export function toPrep(c: BCandidate, method: WorkMethod, suggestions: BInputSuggestion[]): ComparisonPrep {
  return {
    change_id: c.candidate_version_id,
    change_title: c.title,
    task_type: method.task_type,
    method_id: method.id,
    method_version: method.version,
    baseline_label: c.replaces ?? (method.skill ? `${method.skill} (지금 쓰는 스킬)` : '등록한 프롬프트'),
    candidate_label: `${candidateName(c)} ${c.revision}`,
    inputs: suggestions.map((s) => ({
      id: s.suggestion_id,
      kind: suggestionKind[s.kind],
      label: s.label,
      meta: s.meta,
      paths: s.relative_paths,
      excluded: s.excluded_paths,
    })),
    fixed: ['모델', '입력 코드', '요청 문장', '실행 환경', '접근 범위', '실행 한도', '평가 기준'],
    // 설계서 2.3 .env 기본값: MAX_RUN_SECONDS=180, 비교 1회 = 작업 1~3건
    limits: {
      run_count: 1,
      time_limit_sec: 180,
      est_minutes: 6,
      est_cost: null,
    },
  }
}

// ── 적용·복원 ────────────────────────────────────────────

function changeKind(path: string): SwitchChange['kind'] {
  if (/skills?\//.test(path) || /SKILL\.md$/.test(path)) return 'skill'
  if (/(settings|config)/i.test(path)) return 'setting'
  return 'file'
}
const actionLabel = {
  add: '새로 추가',
  replace: '교체',
  delete: '삭제',
} as const

export function toPreview(p: BApplyPreview, support: SupportLevel | undefined): SwitchPreview {
  return {
    preview_id: p.preview_id,
    confirmation_token: p.change_set_sha256,
    candidate_label: p.candidate_label ?? p.candidate_version_id,
    target_path: p.target_path ?? '',
    changes: (p.changes ?? []).map((ch) => ({
      kind: changeKind(ch.path),
      target: ch.path,
      before: null,
      after: null,
      note: ch.note ?? actionLabel[ch.action],
    })),
    additional_permissions: (p.additional_permissions ?? []).map(toPermission),
    env_changes: p.environment_changes ?? [],
    env_checked_at: new Date().toISOString(),
    manual: support !== 'switchable' || !!p.manual_steps?.length,
    manual_steps: p.manual_steps ?? [],
  }
}

export const toSwitch = (r: BApplyResult, comparisonId: string): Switch => ({
  id: r.apply_id,
  comparison_id: comparisonId,
  changes: [],
  applied_at: r.applied_at ?? null,
  result: r.status === 'applied' || r.status === 'applying' ? 'success' : r.status === 'rolled_back' ? 'auto_restored' : 'failed',
  rolled_back: false,
})

// ── 이력 ────────────────────────────────────────────────

const eventAction: Record<BEventType, DecisionAction> = {
  recommendation_snoozed: 'later',
  recommendation_dismissed: 'not_interested',
  comparison_completed: 'compared',
  decision_keep: 'keep',
  decision_more_comparison: 'more_comparison',
  apply_completed: 'switch',
  rollback_completed: 'rolled_back',
  // 배포 서버 이벤트
  skill_applied: 'switch',
  skill_rolled_back: 'rolled_back',
  comparison_decision_recorded: 'chose',
}
const choiceAction = { candidate: 'chose', baseline: 'keep', abstain: 'abstain' } as const
const choiceTitle = { candidate: '후보 방식을 골랐어요', baseline: '기존 방식을 계속 쓰기로 했어요', abstain: '판단을 보류했어요' } as const

export const toHistory = (e: BHistoryEvent): DecisionLog => ({
  id: e.event_id,
  user_id: 'local',
  change_id: e.payload.candidate_version_id ?? e.subject_id,
  change_title: e.payload.change_title ?? (e.payload.choice ? choiceTitle[e.payload.choice] : '기록'),
  action: e.event_type === 'comparison_decision_recorded' && e.payload.choice ? choiceAction[e.payload.choice] : (eventAction[e.event_type] ?? 'compared'),
  summary: e.payload.summary ?? null,
  reason: e.payload.reason ?? null,
  at: e.created_at,
  comparison_id: e.payload.comparison_id ?? null,
  switch_id: e.payload.apply_id ?? null,
  stale_environment: e.payload.stale_environment,
  task_types: e.payload.task_types?.map(toTask),
})
