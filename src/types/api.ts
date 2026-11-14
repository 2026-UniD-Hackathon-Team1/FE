// 화면이 쓰는 데이터 모양. 백엔드 응답(src/api/backend/types.ts)은 src/api/backend/adapt.ts에서 이 모양으로 바꾼다.
import type {
  Candidate,
  Change,
  ComparisonStatus,
  DecisionAction,
  ISODateString,
  Match,
  Permission,
  Project,
  SupportLevel,
  SwitchChange,
  TaskType,
  Verdict,
  WorkMethod,
} from './domain'

export interface ApiErrorBody {
  error: { code: string; message: string }
}

/** 사용자 배경 (설계서 F01 프로필) */
export interface Profile {
  role: string
  primary_language: string
  task_types: TaskType[]
  goals: string[]
  version: number
}
export type ProfileInput = Omit<Profile, 'version'>

/** 변화 목록 항목 (백엔드 GET /api/recommendations) */
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

export interface ChangeDetail {
  match: Match
  change: Change
  candidates: Candidate[]
  latest_comparison?: MatchedChange['latest_comparison']
}

/** 비교 시작: 고른 작업들을 입력으로 등록한 뒤 비교를 만든다 */
export interface StartComparisonBody {
  candidate_id: string
  match_id: string
  task_type: TaskType
  method_id: string
  method_version: number
  inputs: { label: string; paths: string[] }[]
}

export interface DecisionBody {
  action: Extract<DecisionAction, 'keep' | 'later' | 'not_interested' | 'more_comparison'>
  reason?: string
}

export type RollbackReason = 'worse_result' | 'inconvenient' | 'other'

export interface RollbackBody {
  reason: RollbackReason
  note?: string
  /** 교체 뒤 사용자가 직접 고친 파일이 있을 때 (TC-11) */
  conflict_strategy?: 'skip' | 'overwrite'
}

// ── 연결 프로그램 상태 ──────────────────────────────────────

export type AgentStatus = 'connected' | 'disconnected' | 'never_connected'

/** 사용자 컴퓨터의 연결 프로그램 상태와 Codex CLI 준비 상태 (docs/agent-design.md) */
export interface AgentInfo {
  status: AgentStatus
  device_name: string | null
  agent_version: string | null
  runner_version: string | null
  runner_ready: boolean
  last_seen_at: ISODateString | null
}

export interface PairingCode {
  code: string
  expires_at: ISODateString
  command: string
  install_command: string
}

// ── 환경 ────────────────────────────────────────────────

export interface EnvDiff {
  label: string
  before: string
  after: string
}

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
  backups: {
    switch_id: string
    title: string
    taken_at: ISODateString
    applied: boolean
  }[]
}

export interface ProjectPatch {
  work_dir: string
  access_scope: string[]
}

/** 작업 방식 저장 (백엔드 POST /api/work-methods) */
export type WorkMethodInput = Omit<WorkMethod, 'id' | 'project_id' | 'version'>

// ── 교체 ────────────────────────────────────────────────

/** 적용 미리보기 (백엔드 POST /api/apply/preview) */
export interface SwitchPreview {
  preview_id: string
  /** 최종 확인 토큰. 사용자가 본 변경 묶음(change_set)과 같아야 적용된다 */
  confirmation_token: string
  candidate_label: string
  target_path: string
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
  paths: string[]
  excluded: { path: string; reason: string }[]
}

export interface ComparisonPrep {
  change_id: string
  change_title: string
  task_type: TaskType
  method_id: string
  method_version: number
  baseline_label: string
  candidate_label: string
  inputs: InputOption[]
  fixed: string[]
  limits: {
    run_count: number
    time_limit_sec: number
    est_minutes: number
    est_cost: string | null
  }
}

// ── 홈: 진행 중인 비교 (S-02) ─────────────────────────────

export interface ActiveComparison {
  id: string
  change_title: string
  candidate_label: string
  status: ComparisonStatus
  started_at: ISODateString
}
