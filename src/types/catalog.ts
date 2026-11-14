// 서버 후보 수집(카탈로그)과 서버 상태. 응답 모양이 화면에 바로 쓸 만해서 그대로 쓴다.
// 백엔드: backend/main.py(/api/catalog/candidates, /sources, /api/health), backend/catalog/jobs.py, refresh.py

/** GET /api/health */
export interface Health {
  status: 'ok'
  database: 'ready'
}

/** 후보가 어떤 작업·기능에 해당하는지 판단한 근거 (파일의 몇째 줄) */
export interface TagEvidence {
  category: 'task_types' | 'capabilities'
  tag: string
  path: string
  line: number
  excerpt: string
}

/** GET /api/catalog/candidates 한 줄: 공개 저장소에서 찾은 최신 후보 */
export interface CatalogCandidate {
  candidate_version_id: string
  asset_id: string
  kind: 'skill' | 'repo' | string
  title: string
  revision: string
  bundle_sha256: string
  source_url: string
  first_seen_at: string
  support_level: 'information_only'
  performance_status: 'not_compared'
  classification_status: string
  tag_evidence: TagEvidence[]
  demo: boolean
}

export interface CatalogCandidateList {
  items: CatalogCandidate[]
  total: number
  limit: number
  offset: number
}

/** GET /api/catalog/sources */
export interface CatalogSource {
  source_id: string
  kind: string
  url: string
  enabled: boolean
  last_success_at: string | null
  last_error: string | null
}

// ── 운영자 전용 (서버 운영 토큰 X-Local-Token 필요) ──

/** PUT /api/catalog/refresh/schedule */
export interface RefreshSchedule {
  enabled: boolean
  discovery_queries: string[]
  /** 1~5 */
  discovery_limit: number
  /** 300~86400초 */
  resume_interval_seconds: number
  /** 3600~604800초 */
  track_interval_seconds: number
  /** 3600~604800초 */
  discovery_interval_seconds: number
  /** 5~20 */
  max_requests: number
  /** 1~20 */
  batch_size: number
}

/** GET /api/catalog/refresh */
export interface RefreshState {
  schedule: RefreshSchedule
  /** resume·track·discovery 다음 실행 시각 */
  next_runs: Record<string, string>
  next_allowed_at: string | null
  blocked_reason: string | null
  hourly_limit: number
  window_requests: number
  total_requests: number
  job_count: number
  last_job_id: string | null
  worker_required: boolean
}

/** POST /api/catalog/sync */
export interface SyncRequest {
  repositories: { repository: string; skill_folders: string[] }[]
  discovery_queries: string[]
  discovery_limit: number
  batch_size: number
  resume_pending: boolean
  /** 1~50 */
  max_requests: number
}

export interface RepositoryProgress {
  repository: string
  status: 'done' | 'partial' | 'failed' | 'disabled'
  new_versions: number
  commit_sha?: string | null
  completed_units?: number | null
  total_units?: number | null
  resume_required?: boolean | null
  pause_reason?: string | null
  error?: string | null
  retry_after?: string | null
  reset_at?: string | null
}

export type SyncStatus = 'queued' | 'running' | 'done' | 'partial' | 'failed' | 'interrupted'

/** GET /api/catalog/jobs/{job_id} */
export interface SyncJob {
  id: string
  status: SyncStatus
  request_count: number
  max_requests: number
  result: {
    items: RepositoryProgress[]
    discovery_errors: { query: string; error: string; retry_after?: string | null; reset_at?: string | null }[]
  }
  error: string | null
  created_at: string
  updated_at: string
  expires_at: string
}
