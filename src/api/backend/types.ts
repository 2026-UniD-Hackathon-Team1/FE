// 백엔드 응답·요청 타입 (「갈아탈까 해커톤 MVP 구현 설계서」 12장 API 계약 기준).
// 설계서에 응답 모양이 없거나 부족한 곳은 FE가 제안한 모양이고 [요청]으로 표시했다.
// 백엔드가 확정하면 이 파일과 adapt.ts만 고치면 된다. 화면 코드는 FE 도메인 타입만 쓴다.

export type BTask = 'code_review' | 'test_generation'
export type BSupport = 'information_only' | 'comparable' | 'applicable'
export type BCompatibility = 'confirmed' | 'unknown' | 'incompatible'
/** 배포 서버는 사용자 선택값(baseline / candidate / abstain)만 쓴다. tradeoff·tie는 목 데이터용 */
export type BVerdict = 'candidate' | 'baseline' | 'tradeoff' | 'tie' | 'abstain'
export type BComparisonStatus = 'queued' | 'running' | 'evaluating' | 'done' | 'failed' | 'cancelled' | 'interrupted'
export type BRunStatus = 'queued' | 'running' | 'completed' | 'failed' | 'timeout' | 'cancelled' | 'interrupted' | 'output_limit'
/** 설계서 finding.verification. 기본값 unverified */
export type BVerification = 'unverified' | 'reproduced' | 'user_confirmed' | 'false_positive'
/** 설계서 recommendation.status + [요청] kept */
export type BRecommendationStatus = 'new' | 'snoozed' | 'dismissed' | 'compared' | 'kept' | 'applied'
export type BChangeType = 'discovered' | 'new_release' | 'updated' | 'deprecated'
export type BPermissionKind = 'file_read' | 'file_write' | 'network' | 'command_exec'

export interface BError {
  error: {
    code: string
    message: string
    retryable?: boolean
    details?: Record<string, unknown>
  }
}

/** POST /api/auth/signup, /api/auth/login — 로그인 세션 토큰 */
export interface BSessionIssued {
  token: string
  user_id: string
  username: string
}

/** GET /api/auth/me — 로그인한 내 정보. via=local이면 개발용 공용 토큰으로 들어온 것 */
export interface BMe {
  user_id: string
  username: string
  via: 'account' | 'local'
}

// ── 연결 프로그램 (docs/agent-design.md) ─────────────────

/** GET /api/agent — 사용자 컴퓨터의 연결 프로그램 상태 */
export interface BAgent {
  status: 'connected' | 'disconnected' | 'never_connected'
  device_name: string | null
  agent_version: string | null
  codex_version: string | null
  codex_ready: boolean
  last_seen_at: string | null
}
/** GET /api/agent/devices — 연결된 PC 목록. 작업은 기본(is_primary) 기기로 간다 */
export interface BDevice extends BAgent {
  device_id: string
  is_primary: boolean
}
export interface BDeviceList {
  devices: BDevice[]
}

/** POST /api/agent/pairing-code — 온보딩 연결 코드 (8자, 10분 유효) */
export interface BPairingCode {
  code: string
  expires_at: string
  command?: string | null
  install_command?: string | null
}

// ── F01·F02 프로필·환경·작업 방식 ─────────────────────────

/** PUT /api/profile 요청 */
export interface BProfileInput {
  role: string
  primary_language: string
  task_types: BTask[]
  goals: string[]
  preferences: Record<string, unknown>
}
/** PUT /api/profile 응답 (설계서 4.3) */
export interface BProfileSaved {
  profile_id: string
  profile_version: number
  recommendations_stale: boolean
}
/** [요청] GET /api/profile — 온보딩을 마쳤는지 판단하고 설정 화면에 보여준다 */
export interface BProfile extends BProfileInput {
  profile_id: string
  profile_version: number
  updated_at: string
}

export interface BInstalledSkill {
  name: string
  version: string | null
  source: string | null
  /** 목 서버만 준다. 배포 서버는 manifest_sha256을 준다 */
  path?: string
  manifest_sha256?: string
  /** [요청] 비교 대상에서 뺐는지 */
  excluded?: boolean
}

/** POST /api/environment/scan 응답, [요청] GET /api/environment (설계서 3.2 environment 테이블) */
export interface BEnvironment {
  /** 목 서버는 id, 배포 서버는 environment_id */
  id?: string
  environment_id?: string
  scan_job_id?: string
  runner: 'codex_cli' | 'unknown'
  runner_version: string | null
  model_id: string | null
  installed_skills: BInstalledSkill[]
  /** [요청] 읽은 설정 파일 요약과 읽지 못한 파일 */
  settings_files?: {
    path: string
    summary: string
    readable: boolean
    excluded?: boolean
  }[]
  settings_hash: string
  scan_root: string
  /** 허용한 범위. 목 서버는 allowed_scopes, 배포 서버는 scopes */
  allowed_scopes?: string[]
  scopes?: BScope[]
  languages?: string[]
  frameworks?: string[]
  excluded_paths?: { path: string; reason: string }[]
  warnings?: string[]
  scanned_at: string
}
/** 배포 서버: 스캔이 아직 끝나지 않았으면 GET /api/environment가 작업 상태를 준다 (202) */
export interface BJobStatus {
  job_id: string
  status: string
}

/** POST /api/environment/scan 요청 */
/** 배포 서버가 받는 읽기 범위. 쓰기 권한(write)은 받지 않는다 */
export type BScope = 'config' | 'skills' | 'code'
export interface BScanInput {
  root: string
  scopes: BScope[]
}

/** [요청] POST /api/environment/items, PATCH /api/environment/items/{name} — 자동 인식 못한 항목 수동 보완 (F01) */
export interface BEnvItemInput {
  kind: 'runner' | 'model' | 'skill' | 'settings_file'
  name: string
  version: string | null
  source: string | null
  excluded: boolean
}

/** POST /api/work-methods 요청 (설계서 4.3). output_format·test_command는 [요청] */
export interface BWorkMethodInput {
  task_type: BTask
  prompt_text: string
  skill_name?: string | null
  required_checks: string[]
  scoring_preferences: Record<string, 'required' | 'secondary'>
  output_format?: string | null
  test_command?: string | null
}
/** POST /api/work-methods 응답 */
export interface BWorkMethodSaved {
  method_id: string
  version: number
  is_active: boolean
}
/** [요청] GET /api/work-methods — 활성 방식 목록 */
export interface BWorkMethod extends BWorkMethodInput {
  method_id: string
  version: number
  is_active: boolean
  created_at: string
}

// ── F04·F05 추천·후보 ────────────────────────────────────

export interface BLatestComparison {
  comparison_id: string
  /** 배포 서버는 status와 verdict(아직 고르지 않았으면 null)만 준다 */
  status?: string
  verdict?: BVerdict | null
  highlights?: string[]
  completed_at?: string
  runs_per_arm?: number
}

/** GET /api/recommendations 항목 (설계서 6.2). [요청] 표시 필드 추가 */
export interface BRecommendation {
  recommendation_id: string
  candidate_version_id: string
  title: string
  related_reasons: string[]
  source_url: string
  compatibility: BCompatibility
  support_level: BSupport
  performance_status?: string
  actions?: string[]
  // [요청] 아래는 화면 표시에 필요해서 추가로 받고 싶은 필드
  change_type?: BChangeType
  task_types?: BTask[]
  score?: number
  status?: BRecommendationStatus
  snoozed_until?: string | null
  latest_comparison?: BLatestComparison | null
}
export interface BRecommendationList {
  items: BRecommendation[]
}

export interface BDeclaredPermission {
  kind: BPermissionKind
  description: string
  /** 기존 방식보다 추가로 필요한 권한 */
  additional?: boolean | null
}

/** GET /api/candidates/{version_id} (설계서 6.3 "원문·권한·호환성"). 모양은 [요청] */
export interface BCandidate {
  candidate_version_id: string
  /** 목 서버만 준다. 배포 서버는 추천 목록에서 찾아 붙인다 */
  recommendation_id?: string | null
  title: string
  summary: string | null
  change_type?: BChangeType
  task_types: BTask[]
  related_reasons: string[]
  /** 대체하는 기존 작업 단계 */
  replaces?: string | null
  /** 목 서버만 준다. 배포 서버는 kind와 title을 쓴다 */
  asset?: {
    kind: 'skill' | 'repository' | 'model' | 'feature'
    canonical_key: string
    display_name: string
  }
  kind?: string
  revision: string
  source_url: string | null
  published_at: string | null
  first_seen_at: string | null
  verified_source_at: string | null
  /** 제공자가 주장하는 효과 (확인 전) */
  claimed_benefit?: string | null
  maintainer: {
    author?: string | null
    license?: string | null
    last_updated_at?: string | null
  }
  provenance?: 'official' | 'known_author' | 'community' | 'unverified'
  support_level: BSupport
  compatibility: BCompatibility
  permissions: {
    declared: BDeclaredPermission[]
    allowed?: Record<string, unknown>
    observed?: string[]
  }
  risk_signals: string[]
  latest_comparison?: BLatestComparison | null
}

/** [요청] PATCH /api/recommendations/{id} — 나중에 / 관심 없음 / 다시 보기 */
export interface BRecommendationPatch {
  status: 'snoozed' | 'dismissed' | 'new'
  reason?: string
}

// ── F06·F07·F08 비교 ─────────────────────────────────────

/** [요청] GET /api/inputs/suggestions?task_type= — 비교에 쓸 수 있는 최근 diff·파일 묶음·예제 */
export interface BInputSuggestion {
  suggestion_id: string
  kind: 'diff' | 'files' | 'fixture'
  label: string
  meta: string
  relative_paths: string[]
  /** 비밀값이 있을 수 있어 자동으로 뺀 파일 */
  excluded_paths: { path: string; reason: string }[]
}

/** POST /api/inputs 요청·응답 (설계서 12장) */
export interface BInputCreate {
  relative_paths: string[]
  task_type: BTask
}
/** POST /api/inputs, GET /api/inputs/{id}. PC가 파일을 다 읽으면 input_sha256이 있고, 아직이면 job_id·status만 있다 (202) */
export interface BInputCreated {
  input_id: string
  input_sha256?: string
  job_id?: string
  status?: string
  manifest_sha256?: string
}

/** POST /api/comparisons 요청 (설계서 7.4) */
export interface BComparisonCreate {
  method_id: string
  method_version: number
  candidate_version_id: string
  task_type: BTask
  input_ids: string[]
  confirmed_upload_scope: true
  idempotency_key: string
}
export interface BComparisonCreated {
  comparison_id: string
  status: BComparisonStatus
}

/** 배포 서버가 주는 구조화된 결과 (코드 리뷰 지적 목록) */
export interface BRawFinding {
  path: string
  line: number
  severity: 'high' | 'medium' | 'low'
  issue: string
  evidence: string
  suggested_fix: string
}
export interface BRunInputResult {
  input_id: string
  status: BRunStatus
  output_text?: string | null
  seconds?: number | null
  /** 지표 키 → 값. 목 서버는 { value, total }, 배포 서버는 숫자일 수 있다 */
  metrics?: Record<string, number | { value: number | null; total?: number | null }>
  result?: { findings: BRawFinding[]; summary: string } | null
  skill_usage_status?: 'not_expected' | 'confirmed' | 'unconfirmed'
  failure_code?: string | null
  failure_message?: string | null
}

export interface BRun {
  /** 목 서버만 준다 */
  run_id?: string
  arm: 'baseline' | 'candidate'
  status: BRunStatus
  failure_code?: string | null
  failure_message?: string | null
  started_at?: string | null
  ended_at?: string | null
  tokens?: number | null
  cost_usd?: number | null
  cost_kind?: 'estimated' | 'provider' | null
  /** 작업(입력)별 결과 */
  inputs: BRunInputResult[]
}

export interface BFinding {
  finding_id: string
  run_id: string
  input_id: string
  canonical_group: string | null
  path: string | null
  line_number: number | null
  description: string
  verification: BVerification
  user_note: string | null
  history: {
    at: string
    from: BVerification
    to: BVerification
    note: string | null
  }[]
}

/** GET /api/comparisons/{id} (설계서 9.5·11.2). 모양은 [요청] */
export interface BComparison {
  comparison_id: string
  /** 목 서버만 준다. 배포 서버는 추천 목록에서 찾아 붙인다 */
  recommendation_id?: string | null
  candidate_version_id: string
  task_type?: BTask
  /** 다시 실행할 때 그대로 쓴다 (배포 서버) */
  method_id?: string
  method_version?: number
  status: BComparisonStatus
  verdict: BVerdict | null
  verdict_reason?: string | null
  rubric_version: string
  runs_per_arm: number
  baseline_label: string
  candidate_label: string
  change_title: string | null
  is_prerecorded: boolean
  created_at?: string
  completed_at?: string | null
  plan: {
    model_id: string
    runner_version?: string | null
    timeout_seconds?: number | null
    max_estimated_cost_usd?: number | null
  }
  inputs: {
    input_id: string
    label?: string
    ref?: string
    manifest_sha256?: string
    is_fixture?: boolean
    // 배포 서버
    relative_paths?: string[]
    task_type?: string | null
    input_sha256?: string | null
  }[]
  runs: BRun[]
  /** 목 서버는 검증 상태가 붙은 지적 목록. 배포 서버는 runs[].inputs[].result.findings */
  findings?: BFinding[]
  /** LLM 의견. 사실로 확정하지 않는다 (설계서 9.5) */
  llm_judgment?: {
    status: 'opinion'
    summary: string
    next_check: string | null
    verified_as_fact: false
  } | null
  limits: string[]
}

/** [요청] GET /api/comparisons?active=true — 홈의 "진행 중인 비교" */
export interface BComparisonSummary {
  comparison_id: string
  change_title: string
  candidate_label: string
  status: BComparisonStatus
  created_at: string
}

/** PATCH /api/findings/{id} */
export interface BFindingPatch {
  verification: BVerification
  evidence?: { note?: string }
}

/** PATCH /api/comparisons/{id}/decision — 사용자 선택 (설계서 수정안: baseline 기존 유지 / candidate 후보 선택 / abstain 보류) */
export interface BDecision {
  choice: 'baseline' | 'candidate' | 'abstain'
  reason: string
}

// ── F09·F10 적용·복원 ────────────────────────────────────

/** POST /api/apply/preview 응답 (설계서 10.2) */
export interface BApplyPreview {
  preview_id: string
  /** 배포 서버: 미리보기를 만드는 중이면 status만 온다 (GET /api/apply/preview/{id}로 기다림) */
  status?: string
  target_path: string
  changes: {
    path: string
    action: 'add' | 'replace' | 'delete'
    note?: string
  }[]
  additional_permissions: BDeclaredPermission[]
  candidate_version_id: string
  current_state_sha256: string
  change_set_sha256: string
  requires_confirmation: boolean
  // [요청]
  candidate_label?: string
  /** 비교 당시와 지금 환경이 다르면 (TC-09) */
  environment_changes?: { label: string; before: string; after: string }[]
  /** applicable이 아닌 후보의 수동 적용 방법 (F09) */
  manual_steps?: { title: string; command: string }[] | null
}

/** POST /api/apply 요청 (설계서 10.3) */
export interface BApplyInput {
  preview_id: string
  /** 사용자가 본 변경 묶음의 해시 (미리보기의 change_set_sha256) */
  change_set_sha256: string
}
export interface BApplyResult {
  apply_id: string
  /** 배포 서버는 queued·running 같은 진행 상태를 거쳐 끝난다 (GET /api/apply/{id}로 기다림) */
  status: string
  applied_at?: string | null
  reason?: string
  conflict_paths?: string[]
}

/** POST /api/apply/{id}/rollback (설계서 10.4) */
export interface BRollbackInput {
  confirmed: true
  /** [요청] 배포 서버는 아직 받지 않는다 */
  reason?: string
  /** [요청] 배포 서버는 아직 받지 않는다. 충돌이 있을 때 건너뛸지 덮어쓸지 */
  conflict_strategy?: 'skip' | 'overwrite'
}
export interface BRollbackResult {
  status: 'rolled_back' | 'conflict'
  reason?: string
  conflict_paths?: string[]
}

// ── F11 이력·저장소 ──────────────────────────────────────

export type BEventType =
  'recommendation_snoozed' | 'recommendation_dismissed' | 'comparison_completed' | 'decision_keep' | 'decision_more_comparison' | 'apply_completed' | 'rollback_completed'

/** GET /api/history (설계서 11.1) */
export interface BHistoryEvent {
  event_id: string
  event_type: BEventType
  subject_id: string
  created_at: string
  payload: {
    change_title: string
    candidate_version_id?: string
    task_types?: BTask[]
    summary?: string | null
    reason?: string | null
    comparison_id?: string | null
    apply_id?: string | null
    stale_environment?: boolean
  }
}
export interface BHistory {
  items: BHistoryEvent[]
}

/** [요청] GET /api/storage — 설정의 데이터 관리 (F11 삭제, 백업 경고) */
export interface BStorage {
  comparison_count: number
  backups: {
    apply_id: string
    title: string
    created_at: string
    applied: boolean
  }[]
}
