// 명세 7장 엔티티 기준 타입. 필드명은 API 응답(snake_case) 그대로 둔다.

export type ISODateString = string

export type TaskType = 'code_review' | 'test_writing'

// ── 환경 (M1) ────────────────────────────────────────────

export type ProjectConnection = 'connected' | 'disconnected'

export interface Project {
  id: string
  user_id: string
  name: string
  work_dir: string
  access_scope: string[]
  connection: ProjectConnection
}

export interface EnvItem {
  name: string
  /** 확인하지 못하면 null → 화면에서 "미확인" */
  version: string | null
  source: string | null
  last_checked_at: ISODateString | null
  excluded: boolean
}

export interface Environment {
  id: string
  project_id: string
  tool: EnvItem
  model: EnvItem
  skills: EnvItem[]
  config_files: { path: string; summary: string }[]
  /** 읽지 못한 설정 파일 (수동 입력 안내) */
  unreadable_files?: string[]
  last_checked_at: ISODateString
}

export interface WorkMethod {
  id: string
  project_id: string
  task_type: TaskType
  prompt: string | null
  skill: string | null
  output_format: string | null
  test_command: string | null
  /** 필수 조건 */
  required_conditions: string[]
  /** 보조 항목 */
  secondary_metrics: string[]
  version: number
}

// ── 변화와 후보 (M2) ─────────────────────────────────────

export type ChangeType =
  | 'new_skill'
  | 'skill_update'
  | 'feature_change'
  | 'usage_changed'
  | 'step_obsolete'
  | 'deprecated'

export type SourceKind =
  | 'official_changelog'
  | 'registry'
  | 'package_registry'
  | 'manual_verified'

export type Impact = 'high' | 'medium' | 'low'

export interface ChangeSource {
  url: string
  kind: SourceKind
}

export interface Change {
  id: string
  title: string
  change_type: ChangeType
  target_tool: string
  target_versions: string
  task_types: TaskType[]
  replaces: string[]
  summary: string
  /** 제공자 주장. 갈아탈까가 확인한 결과가 아님 */
  claimed_benefit: string | null
  sources: ChangeSource[]
  published_at: ISODateString
  verified_at: ISODateString
  impact_hint: Impact
}

export type SupportLevel = 'info_only' | 'comparable' | 'switchable'
export type CandidateStatus = 'active' | 'paused'
export type Provenance = 'official' | 'community' | 'unverified'
export type Compatibility = 'runnable' | 'needs_setup' | 'unsupported' | 'unknown'
export type PermissionKind = 'file_read' | 'file_write' | 'network' | 'command_exec'

export interface Permission {
  kind: PermissionKind
  /** 사람이 읽을 수 있는 설명. 예: "src/ 아래 파일 읽기" */
  description: string
  /** 기존 방식보다 추가로 필요한 권한인지 */
  is_additional: boolean
}

export interface Candidate {
  id: string
  change_id: string
  pinned_version: string
  support_level: SupportLevel
  status: CandidateStatus
  provenance: Provenance
  repository_url: string
  author: string
  license: string | null
  last_maintained_at: ISODateString | null
  permissions: Permission[]
  compatibility: Compatibility
  required_setup: string[]
  /** 확인된 위험 신호. 빈 배열이어도 "안전"이 아니라 "확인된 위험 신호 없음" */
  risk_signals: string[]
}

// ── 매칭 (M3) ────────────────────────────────────────────

export type MatchStatus =
  | 'new'
  | 'seen'
  | 'snoozed'
  | 'dismissed'
  | 'compared'
  | 'kept'
  | 'switched'
  | 'rolled_back'

export type ChangeNature = 'action_required' | 'improvement'

export interface Match {
  id: string
  change_id: string
  environment_id: string
  impact: Impact
  nature: ChangeNature
  /** 사용자 등록 정보와 연결된 매칭 이유 */
  reason: string
  status: MatchStatus
  snoozed_until: ISODateString | null
}

// ── 비교 (M5, M6) ────────────────────────────────────────

export type ComparisonStatus =
  | 'queued'
  | 'running_baseline'
  | 'running_candidate'
  | 'evaluating'
  | 'done'
  | 'failed'
  | 'timeout'
  | 'cancelled'

export type Verdict =
  | 'candidate_better'
  | 'depends_on_criteria'
  | 'baseline_better'
  | 'no_difference'
  | 'inconclusive'

export type Method = 'baseline' | 'candidate'

export interface ComparisonInput {
  id: string
  label: string
  /** 파일 경로, PR 번호, 커밋 등 */
  ref: string
  content_hash: string
  is_example: boolean
}

export interface FixedConditions {
  model_id: string
  baseline_label: string
  candidate_label: string
  time_limit_sec: number
  /** 예상 비용. 산정 불가면 null → "확인 불가" */
  estimated_cost: string | null
}

export interface Comparison {
  id: string
  match_id: string
  candidate_id: string
  inputs: ComparisonInput[]
  conditions: FixedConditions
  status: ComparisonStatus
  verdict: Verdict | null
  verdict_reason: string | null
  verdict_rule_version: string
  run_count: number
  /** 사전 실행 결과를 보여줄 때 실행 시각 표시용 */
  executed_at: ISODateString | null
  is_prerecorded: boolean
  results: ComparisonResult[]
  /** 화면 표시용으로 함께 내려주는 후보와 변화 정보 */
  candidate?: Candidate
  change?: { id: string; title: string }
  /** AI 해설 (P6: 측정값과 구분해서 표시) */
  ai_note?: { summary: string; next_check: string | null } | null
}

/** 측정값 / 사용자 확인 / AI 해설 구분 (P6) */
export type EvidenceKind = 'measured' | 'user_verified' | 'ai_note'

export type MetricChange = 'improved' | 'worsened' | 'same' | 'unverified'

export interface MetricValue {
  key: string
  label: string
  /** 측정 실패 또는 미표기면 null */
  value: number | null
  unit: string
  /** 예: "작업 3개 합계" */
  basis: string
  /** "3개 중 3개"처럼 분모가 있는 지표 */
  total?: number | null
  evidence: EvidenceKind
}

export interface ComparisonResult {
  id: string
  comparison_id: string
  input_id: string
  method: Method
  raw_output: string
  metrics: MetricValue[]
  duration_ms: number | null
  usage: { tokens: number | null; cost: string | null; cost_kind: 'estimated' | 'provider' | null }
  run_status: 'success' | 'failed' | 'timeout'
  failure_reason: string | null
  findings: Finding[]
}

export type FindingVerification =
  | 'reproduced'
  | 'user_confirmed'
  | 'false_positive'
  | 'needs_check'

export interface FindingHistoryEntry {
  at: ISODateString
  from: FindingVerification
  to: FindingVerification
  note: string | null
}

export interface Finding {
  id: string
  comparison_result_id: string
  location: string
  content: string
  group_id: string | null
  severity: string | null
  verification: FindingVerification
  user_note: string | null
  history: FindingHistoryEntry[]
}

// ── 교체와 복원 (M7) ─────────────────────────────────────

export interface SwitchChange {
  kind: 'file' | 'setting' | 'skill'
  target: string
  before: string | null
  after: string | null
}

export interface Switch {
  id: string
  comparison_id: string
  changes: SwitchChange[]
  applied_at: ISODateString | null
  result: 'success' | 'failed' | 'auto_restored'
  rolled_back: boolean
}

export interface Snapshot {
  id: string
  project_id: string
  switch_id: string
  taken_at: ISODateString
  status: 'valid' | 'used'
}

// ── 이력 (M8) ────────────────────────────────────────────

export type DecisionAction =
  | 'switch'
  | 'keep'
  | 'more_comparison'
  | 'later'
  | 'not_interested'
  | 'compared'
  | 'rolled_back'

export interface DecisionLog {
  id: string
  user_id: string
  change_id: string
  change_title: string
  action: DecisionAction
  summary: string | null
  reason: string | null
  at: ISODateString
  comparison_id?: string | null
  switch_id?: string | null
  /** 현재 환경과 다른 버전에서 실행한 결과 */
  stale_environment?: boolean
}
