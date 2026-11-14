// ⚠️ 개발용. data.ts의 더미 데이터를 백엔드 설계서 응답 모양(src/api/backend/types.ts)으로 바꿔 둔 목 저장소.
import * as db from './data'
import { fromVerification, fromWorkMethod } from '../api/backend/adapt'
import type * as B from '../api/backend/types'
import type { Candidate, Change, ChangeType, Comparison, MatchStatus, SupportLevel, TaskType } from '../types/domain'

const task = (t: TaskType): B.BTask => (t === 'test_writing' ? 'test_generation' : 'code_review')
const changeType = (t: ChangeType): B.BChangeType => (t === 'deprecated' ? 'deprecated' : t === 'new_skill' ? 'new_release' : 'updated')
const support = (s: SupportLevel | undefined): B.BSupport => (s === 'switchable' ? 'applicable' : s === 'comparable' ? 'comparable' : 'information_only')
const recStatus: Record<MatchStatus, B.BRecommendationStatus> = {
  new: 'new',
  seen: 'new',
  snoozed: 'snoozed',
  dismissed: 'dismissed',
  compared: 'compared',
  kept: 'kept',
  switched: 'applied',
  rolled_back: 'compared',
}
const score = { high: 80, medium: 55, low: 30 } as const
const verdict: Record<NonNullable<Comparison['verdict']>, B.BVerdict> = {
  candidate_better: 'candidate',
  baseline_better: 'baseline',
  depends_on_criteria: 'tradeoff',
  no_difference: 'tie',
  inconclusive: 'abstain',
}

const candOf = (changeId: string): Candidate | undefined => db.candidates.find((c) => c.change_id === changeId)
const changeOf = (id: string): Change | undefined => db.changes.find((c) => c.id === id)
const skillName = (c: Change) => c.title.match(/[a-z][a-z-]+(?= [\d.]+)/)?.[0] ?? c.title

// ── 프로필·환경·작업 방식 ────────────────────────────────

export const state = {
  /** 개발용: localStorage 'mock:fresh'='1'이면 처음 쓰는 사용자 (온보딩부터) */
  profile: null as B.BProfile | null,
  environment: null as B.BEnvironment | null,
  methods: [] as B.BWorkMethod[],
  connected: true,
}

export function seedProfile() {
  state.profile = {
    profile_id: 'local',
    profile_version: 1,
    role: '백엔드 개발',
    primary_language: 'python',
    task_types: ['code_review', 'test_generation'],
    goals: ['exception_handling', 'input_validation'],
    preferences: {},
    updated_at: db.at(-7, 10, 0),
  }
  state.environment = {
    id: 'env_001',
    runner: 'codex_cli',
    runner_version: '0.48.0',
    model_id: 'gpt-5-codex',
    installed_skills: db.environment.skills.map((s) => ({
      name: s.name,
      version: s.version,
      source: s.source,
      path: `.agents/skills/${s.name}`,
      excluded: s.excluded,
    })),
    settings_files: [
      ...db.environment.config_files.map((f) => ({
        path: f.path,
        summary: f.summary,
        readable: true,
      })),
      ...(db.environment.unreadable_files ?? []).map((p) => ({
        path: p,
        summary: '읽을 수 없는 형식',
        readable: false,
      })),
    ],
    settings_hash: 'a1b2c3',
    scan_root: '~/work/shop-api',
    allowed_scopes: ['config', 'skills', 'code'],
    scanned_at: db.at(0, 14, 2),
  }
  state.methods = db.workMethods.map((m, i) => ({
    ...fromWorkMethod({ ...m }),
    method_id: m.id,
    version: m.version,
    is_active: true,
    created_at: db.at(-7, 10, i),
  }))
}

// ── 추천·후보 ────────────────────────────────────────────

export function recommendation(matchId: string): B.BRecommendation | null {
  const m = db.matches.find((x) => x.id === matchId)
  const c = m && changeOf(m.change_id)
  if (!m || !c) return null
  const cand = candOf(c.id)
  const last = db.latestByMatch[m.id]
  const cmp = last ? comparisons.get(last.id) : undefined
  return {
    recommendation_id: m.id,
    candidate_version_id: c.id,
    title: c.title,
    related_reasons: [m.reason],
    source_url: c.sources[0]?.url ?? '',
    compatibility: cand?.compatibility === 'runnable' ? 'confirmed' : 'unknown',
    support_level: support(cand?.support_level),
    performance_status: cmp ? 'compared' : 'not_compared',
    actions: ['compare', 'later', 'dismiss'],
    change_type: changeType(c.change_type),
    task_types: c.task_types.map(task),
    score: score[m.impact],
    status: recStatus[m.status],
    snoozed_until: m.snoozed_until,
    latest_comparison: cmp?.verdict
      ? {
          comparison_id: cmp.comparison_id,
          verdict: cmp.verdict,
          highlights: last.highlights,
          completed_at: cmp.completed_at ?? cmp.created_at,
          runs_per_arm: 1,
        }
      : null,
  }
}

export function candidate(changeId: string): B.BCandidate | null {
  const c = changeOf(changeId)
  if (!c) return null
  const cand = candOf(c.id)
  const m = db.matches.find((x) => x.change_id === c.id)
  const rec = m ? recommendation(m.id) : null
  return {
    candidate_version_id: c.id,
    recommendation_id: m?.id ?? null,
    title: c.title,
    summary: c.summary,
    change_type: changeType(c.change_type),
    task_types: c.task_types.map(task),
    related_reasons: m ? [m.reason] : [],
    replaces: c.replaces[0] ?? null,
    asset: {
      kind: c.change_type === 'feature_change' || c.change_type === 'usage_changed' ? 'feature' : 'skill',
      canonical_key: `github:example/${skillName(c)}`,
      display_name: skillName(c),
    },
    revision: cand?.pinned_version ?? '확인 불가',
    source_url: cand?.repository_url ?? c.sources[0]?.url ?? '',
    published_at: c.published_at,
    first_seen_at: c.verified_at,
    verified_source_at: c.verified_at,
    claimed_benefit: c.claimed_benefit,
    maintainer: {
      author: cand?.author ?? '확인 불가',
      license: cand?.license ?? null,
      last_updated_at: cand?.last_maintained_at ?? null,
    },
    provenance: cand?.provenance ?? 'unverified',
    support_level: support(cand?.support_level),
    compatibility: cand?.compatibility === 'runnable' ? 'confirmed' : cand?.compatibility === 'unsupported' ? 'incompatible' : 'unknown',
    permissions: {
      declared: (cand?.permissions ?? []).map((p) => ({
        kind: p.kind,
        description: p.description,
        additional: p.is_additional,
      })),
      allowed: { network: false, write_source: false, allow_scripts: false },
      observed: [],
    },
    risk_signals: cand?.risk_signals ?? [],
    latest_comparison: rec?.latest_comparison ?? null,
  }
}

// ── 비교 ────────────────────────────────────────────────

function toB(c: Comparison): B.BComparison {
  const cand = db.candidates.find((x) => x.id === c.candidate_id)
  const changeId = cand?.change_id ?? ''
  const runs: B.BRun[] = (['baseline', 'candidate'] as const).map((arm) => {
    const rs = c.results.filter((r) => r.method === arm)
    const failed = rs.every((r) => r.run_status !== 'success')
    return {
      run_id: `${c.id}_${arm}`,
      arm,
      status: failed ? 'failed' : 'completed',
      failure_code: failed ? 'RUN_FAILED' : null,
      failure_message: failed ? (rs[0]?.failure_reason ?? null) : null,
      started_at: c.executed_at,
      ended_at: c.executed_at,
      tokens: null,
      cost_usd: null,
      cost_kind: 'estimated',
      inputs: rs.map((r) => ({
        input_id: r.input_id,
        status: r.run_status === 'success' ? 'completed' : r.run_status,
        output_text: r.raw_output,
        seconds: r.duration_ms !== null ? r.duration_ms / 1000 : null,
        metrics: Object.fromEntries(r.metrics.filter((x) => x.key !== 'duration').map((x) => [x.key, { value: x.value, total: x.total ?? null }])),
        failure_message: r.failure_reason,
      })),
    }
  })
  const findings: B.BFinding[] = c.results.flatMap((r) =>
    r.findings.map((f) => {
      const [path, line] = f.location.split(':')
      return {
        finding_id: f.id,
        run_id: `${c.id}_${r.method}`,
        input_id: r.input_id,
        canonical_group: f.group_id,
        path,
        line_number: line && /^\d+$/.test(line) ? Number(line) : null,
        description: f.content,
        verification: fromVerification(f.verification),
        user_note: f.user_note,
        history: [],
      }
    }),
  )
  return {
    comparison_id: c.id,
    recommendation_id: c.match_id,
    candidate_version_id: changeId,
    task_type: changeOf(changeId)?.task_types[0] === 'test_writing' ? 'test_generation' : 'code_review',
    status: c.status === 'failed' ? 'failed' : 'done',
    verdict: c.verdict ? verdict[c.verdict] : null,
    verdict_reason: c.verdict_reason,
    rubric_version: c.verdict_rule_version,
    runs_per_arm: c.run_count,
    baseline_label: c.conditions.baseline_label,
    candidate_label: c.conditions.candidate_label,
    change_title: changeOf(changeId)?.title ?? null,
    is_prerecorded: c.is_prerecorded,
    created_at: c.executed_at ?? db.at(0, 14, 0),
    completed_at: c.executed_at,
    plan: {
      model_id: 'gpt-5-codex',
      runner_version: '0.48.0',
      timeout_seconds: 180,
      max_estimated_cost_usd: 0.4,
    },
    inputs: c.inputs.map((i) => ({
      input_id: i.id,
      label: i.label,
      ref: i.ref,
      manifest_sha256: i.content_hash,
      is_fixture: i.is_example,
    })),
    runs,
    findings,
    llm_judgment: c.ai_note
      ? {
          status: 'opinion',
          summary: c.ai_note.summary,
          next_check: c.ai_note.next_check,
          verified_as_fact: false,
        }
      : null,
    limits: ['각 방식 1회 실행'],
  }
}

export const comparisons = new Map<string, B.BComparison>(Object.values(db.comparisons).map((c) => [c.id, toB(c)]))

/** 새로 시작한 비교는 시간에 따라 진행되는 것처럼 흉내낸다 */
export const startedAt = new Map<string, number>()
const STEP_MS = 3000

export function withProgress(c: B.BComparison): B.BComparison {
  const t0 = startedAt.get(c.comparison_id)
  if (t0 === undefined || c.status === 'cancelled') return c
  const step = Math.floor((Date.now() - t0) / STEP_MS) // 0 대기, 1 기존 실행, 2 후보 실행, 3 평가, 4 완료
  if (step >= 4) return c
  const status: B.BComparisonStatus = step === 0 ? 'queued' : step === 3 ? 'evaluating' : 'running'
  const runStatus = (arm: 'baseline' | 'candidate'): B.BRunStatus => {
    const at = arm === 'baseline' ? 1 : 2
    return step > at ? 'completed' : step === at ? 'running' : 'queued'
  }
  return {
    ...c,
    status,
    verdict: null,
    verdict_reason: null,
    completed_at: null,
    runs: c.runs.map((r) => ({
      ...r,
      status: runStatus(r.arm),
      inputs:
        runStatus(r.arm) === 'completed'
          ? r.inputs
          : r.inputs.map((i) => ({
              ...i,
              status: runStatus(r.arm),
              output_text: '',
            })),
    })),
  }
}

// ── 입력 후보 ────────────────────────────────────────────

const optionPaths: Record<string, string[]> = {
  in_128: ['src/orders/cancel.py', 'src/orders/refund.py', 'src/orders/status.py', 'tests/test_orders.py'],
  in_124: ['src/coupons/apply.py', 'src/coupons/expire.py', 'tests/test_coupons.py'],
  in_119: ['src/payments/retry.py', 'src/payments/client.py', 'tests/test_payments.py'],
  in_117: ['README.md'],
  in_files_orders: ['src/orders/cancel.py', 'src/orders/refund.py', 'src/orders/status.py'],
  in_files_coupons: ['src/coupons/apply.py', 'src/coupons/expire.py', 'src/coupons/rules.py'],
  in_files_payments: ['src/payments/retry.py', 'src/payments/client.py', 'src/payments/webhook.py', 'src/payments/refund.py'],
  in_example: ['fixtures/review_case_01/source/orders.py'],
}

export const suggestions = (): B.BInputSuggestion[] =>
  db.inputOptions.map((o) => ({
    suggestion_id: o.id,
    kind: o.kind === 'pr' ? 'diff' : o.kind === 'files' ? 'files' : 'fixture',
    label: o.label,
    meta: o.meta,
    relative_paths: optionPaths[o.id] ?? [],
    excluded_paths: o.kind === 'example' ? [] : [{ path: 'config/secrets.json', reason: '비밀값이 있을 수 있어요' }],
  }))

export const inputs = new Map<string, { label: string; paths: string[] }>()

// ── 적용·이력 ────────────────────────────────────────────

export const applies = new Map<
  string,
  {
    comparison_id: string
    title: string
    created_at: string
    status: 'applied' | 'rolled_back'
    conflict: boolean
  }
>([
  [
    'sw_pr',
    {
      comparison_id: 'cmp_a',
      title: 'pr-review 2.1.0 교체',
      created_at: db.at(0, 14, 32),
      status: 'applied',
      conflict: true,
    },
  ],
  [
    'sw_ch',
    {
      comparison_id: 'cmp_a',
      title: 'commit-helper 0.4.1 교체',
      created_at: db.at(-7, 17, 0),
      status: 'rolled_back',
      conflict: false,
    },
  ],
  [
    'sw_lint',
    {
      comparison_id: 'cmp_a',
      title: 'lint-fix 1.8.0 교체',
      created_at: db.at(-12, 11, 0),
      status: 'rolled_back',
      conflict: false,
    },
  ],
])

const actionEvent: Record<string, B.BEventType> = {
  switch: 'apply_completed',
  compared: 'comparison_completed',
  keep: 'decision_keep',
  later: 'recommendation_snoozed',
  not_interested: 'recommendation_dismissed',
  rolled_back: 'rollback_completed',
  more_comparison: 'decision_more_comparison',
}

export const history: B.BHistoryEvent[] = db.history.map((l) => ({
  event_id: l.id,
  event_type: actionEvent[l.action],
  subject_id: l.switch_id ?? l.comparison_id ?? l.change_id,
  created_at: l.at,
  payload: {
    change_title: l.change_title,
    candidate_version_id: l.change_id,
    task_types: changeOf(l.change_id)?.task_types.map(task),
    summary: l.summary,
    reason: l.reason,
    comparison_id: l.comparison_id ?? null,
    apply_id: l.switch_id ?? null,
    stale_environment: l.stale_environment,
  },
}))

export function logEvent(type: B.BEventType, changeId: string, payload: Partial<B.BHistoryEvent['payload']>) {
  const c = changeOf(changeId)
  history.unshift({
    event_id: `ev_${Date.now()}`,
    event_type: type,
    subject_id: payload.apply_id ?? payload.comparison_id ?? changeId,
    created_at: new Date().toISOString(),
    payload: {
      change_title: c?.title ?? '',
      candidate_version_id: changeId,
      task_types: c?.task_types.map(task),
      ...payload,
    },
  })
}

export const setMatchStatus = (matchId: string, s: MatchStatus, snoozedUntil: string | null = null) => {
  const m = db.matches.find((x) => x.id === matchId)
  if (m) {
    m.status = s
    m.snoozed_until = snoozedUntil
  }
}

export { db }
