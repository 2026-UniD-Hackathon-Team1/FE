import type {
  Candidate,
  Change,
  DecisionAction,
  ISODateString,
  Match,
  Permission,
  Project,
  SupportLevel,
  SwitchChange,
  Verdict,
} from './domain'

export interface ApiErrorBody {
  error: { code: string; message: string }
}

/** GET /api/me (D-04: GitHub 로그인) */
export interface Me {
  id: string
  login: string
  name: string | null
  avatar_url: string | null
}

/** GET /api/changes 항목 */
export interface MatchedChange {
  match: Match
  change: Change
  /** 비교에 쓸 후보 (없으면 정보만) */
  candidate_id: string | null
  support_level: SupportLevel | null
  /** 이미 비교했으면 최근 결과 요약 (6.2장 5번: 판정 요약과 지표 2~3개) */
  latest_comparison?: {
    id: string
    verdict: Verdict
    highlights: string[]
    executed_at: ISODateString
    run_count: number
  } | null
}

/** GET /api/changes/:id */
export interface ChangeDetail {
  match: Match
  change: Change
  candidates: Candidate[]
  latest_comparison?: MatchedChange['latest_comparison']
}

export interface StartComparisonBody {
  candidate_id: string
  match_id: string
  input_ids: string[]
  excluded_paths: string[]
}

export interface DecisionBody {
  action: Extract<DecisionAction, 'keep' | 'later' | 'not_interested' | 'more_comparison'>
  reason?: string
}

export interface SwitchBody {
  comparison_id: string
  /** 없으면 서버가 거부 (FR-28, TC-14) */
  confirmed: true
}

export type RollbackReason = 'worse_result' | 'inconvenient' | 'other'

export interface RollbackBody {
  reason: RollbackReason
  note?: string
  /** 교체 뒤 사용자가 직접 고친 파일이 있을 때 (TC-11) */
  conflict_strategy?: 'skip' | 'overwrite'
}

// ── 로컬 연결 프로그램 (D-03) ────────────────────────────

export type AgentStatus = 'waiting' | 'connected' | 'disconnected'

export interface AgentInfo {
  status: AgentStatus
  device: string | null
  version: string | null
  last_seen_at: ISODateString | null
}

/** POST /api/projects/:id/agent/code — 연결 코드 8자, 10분 유효 */
export interface AgentCode {
  code: string
  command: string
  expires_at: ISODateString
}

// ── 환경 ────────────────────────────────────────────────

export interface EnvDiff {
  label: string
  before: string
  after: string
}

/** POST /api/projects/:id/environment/recheck (FR-03) */
export interface EnvRecheck {
  checked_at: ISODateString
  changes: EnvDiff[]
}

export interface EnvItemInput {
  kind: 'tool' | 'model' | 'skill' | 'config'
  name: string
  version: string | null
  source: string | null
  excluded: boolean
}

export interface ProjectDetail extends Project {
  comparison_count: number
  backups: { switch_id: string; title: string; taken_at: ISODateString; applied: boolean }[]
}

// ── 교체 ────────────────────────────────────────────────

/** GET /api/comparisons/:id/switch-preview (FR-28) */
export interface SwitchPreview {
  candidate_label: string
  changes: (SwitchChange & { note: string })[]
  additional_permissions: Permission[]
  /** 비교 당시와 지금 환경이 다르면 (TC-09) */
  env_changes: EnvDiff[]
  env_checked_at: ISODateString
  /** 직접 적용을 지원하지 않는 후보 (FR-30) */
  manual: boolean
  manual_steps: { title: string; command: string }[]
}

// ── 비교 준비 (S-04) ─────────────────────────────────────

export interface InputOption {
  id: string
  kind: 'pr' | 'files' | 'example'
  label: string
  meta: string
}

/** GET /api/comparisons/prepare?candidate=&match= */
export interface ComparisonPrep {
  change_id: string
  change_title: string
  baseline_label: string
  candidate_label: string
  inputs: InputOption[]
  send_files: string[]
  excluded_files: { path: string; reason: string }[]
  fixed: string[]
  limits: { run_count: number; time_limit_sec: number; est_minutes: number; est_cost: string | null }
}
