// 목 서버: 서버가 공개 저장소에서 찾은 후보(카탈로그)와 수집 관리 상태
import { at } from './data'
import type { CatalogCandidate, CatalogSource, RefreshSchedule, RefreshState, SyncJob, SyncRequest } from '../types/catalog'

const ev = (category: 'task_types' | 'capabilities', tag: string, path: string, line: number, excerpt: string) => ({ category, tag, path, line, excerpt })

const cand = (
  n: number,
  kind: 'skill' | 'repo',
  title: string,
  repo: string,
  revision: string,
  day: number,
  tags: CatalogCandidate['tag_evidence'],
  demo = false,
): CatalogCandidate => ({
  candidate_version_id: `cv_${n}`,
  asset_id: `asset_${n}`,
  kind,
  title,
  revision,
  bundle_sha256: `${n}f3a9c0d1e2b4`.padEnd(64, '0'),
  source_url: `https://github.com/${repo}`,
  first_seen_at: at(day, 9 + (n % 8), (n * 7) % 60),
  support_level: 'information_only',
  performance_status: 'not_compared',
  classification_status: tags.length ? 'classified' : 'unclassified',
  tag_evidence: tags,
  demo,
})

export const catalogCandidates: CatalogCandidate[] = [
  cand(1, 'skill', 'pr-review', 'example-org/agent-skills/tree/main/pr-review', 'v2.1.0', 0, [
    ev('task_types', 'code_review', 'pr-review/SKILL.md', 3, 'Review the diff of a pull request and report bugs with file and line.'),
    ev('capabilities', 'concurrency', 'pr-review/SKILL.md', 18, 'Check race conditions when the same resource is updated twice.'),
  ]),
  cand(2, 'skill', 'test-writer', 'example-org/agent-skills/tree/main/test-writer', 'v1.4.2', -1, [
    ev('task_types', 'test_generation', 'test-writer/SKILL.md', 2, 'Write unit tests for the changed functions, including failure paths.'),
    ev('capabilities', 'boundary_values', 'test-writer/SKILL.md', 11, 'Always add boundary value cases (0, empty, max).'),
  ]),
  cand(3, 'skill', 'secure-review', 'sec-tools/review-skills/tree/main/secure-review', 'v0.9.0', -2, [
    ev('task_types', 'code_review', 'secure-review/SKILL.md', 4, 'Focus the review on injection, authz and secret handling.'),
    ev('capabilities', 'security', 'secure-review/SKILL.md', 9, 'Flag hard-coded tokens and missing permission checks.'),
  ]),
  cand(4, 'repo', 'review-prompts', 'devtips/review-prompts', 'a1c93e7', -3, [
    ev('task_types', 'code_review', 'README.md', 12, 'A set of prompts for reviewing backend pull requests.'),
  ]),
  cand(5, 'skill', 'pytest-helper', 'py-agents/skills/tree/main/pytest-helper', 'v0.3.1', -4, [
    ev('task_types', 'test_generation', 'pytest-helper/SKILL.md', 5, 'Generate pytest fixtures and parametrized tests.'),
  ]),
  cand(6, 'repo', 'agent-skill-collection', 'community/agent-skill-collection', '5be2f10', -6, []),
  cand(7, 'skill', 'api-doc-check', 'docs-bot/skills/tree/main/api-doc-check', 'v1.0.0', -8, [
    ev('capabilities', 'documentation', 'api-doc-check/SKILL.md', 7, 'Compare response field names with the API document.'),
  ]),
  cand(8, 'skill', 'demo-review', 'galtalka/demo-skills/tree/main/demo-review', 'v0.1.0', -10, [
    ev('task_types', 'code_review', 'demo-review/SKILL.md', 1, 'Demo skill used for the first comparison.'),
  ], true),
]

export const catalogSources: CatalogSource[] = [
  { source_id: 'github:example-org/agent-skills', kind: 'github_repo', url: 'https://github.com/example-org/agent-skills', enabled: true, last_success_at: at(0, 6, 0), last_error: null },
  { source_id: 'github:sec-tools/review-skills', kind: 'github_repo', url: 'https://github.com/sec-tools/review-skills', enabled: true, last_success_at: at(-1, 6, 0), last_error: null },
  { source_id: 'github:community/agent-skill-collection', kind: 'github_repo', url: 'https://github.com/community/agent-skill-collection', enabled: true, last_success_at: at(-2, 6, 0), last_error: 'rate_limited' },
  { source_id: 'github:old-org/legacy-skills', kind: 'github_repo', url: 'https://github.com/old-org/legacy-skills', enabled: false, last_success_at: null, last_error: null },
]

const schedule: RefreshSchedule = {
  enabled: false,
  discovery_queries: ['claude skill code review'],
  discovery_limit: 1,
  resume_interval_seconds: 300,
  track_interval_seconds: 21600,
  discovery_interval_seconds: 86400,
  max_requests: 10,
  batch_size: 5,
}

export const refresh: RefreshState = {
  schedule,
  next_runs: {},
  next_allowed_at: null,
  blocked_reason: null,
  hourly_limit: 60,
  window_requests: 12,
  total_requests: 148,
  job_count: 9,
  last_job_id: null,
  worker_required: true,
}

/** 수집 작업: 만든 뒤 시간이 지나면 진행된 것처럼 보여준다 */
const jobs = new Map<string, { req: SyncRequest; created: number }>()

export function createJob(req: SyncRequest): SyncJob {
  const id = `sync_${jobs.size + 1}_${Date.now().toString(36)}`
  jobs.set(id, { req, created: Date.now() })
  refresh.last_job_id = id
  refresh.job_count += 1
  return jobOf(id)!
}

export function jobOf(id: string): SyncJob | null {
  const j = jobs.get(id)
  if (!j) return null
  const sec = (Date.now() - j.created) / 1000
  const targets = j.req.repositories.length ? j.req.repositories.map((r) => r.repository) : j.req.resume_pending ? ['community/agent-skill-collection'] : []
  const total = Math.max(targets.length, 1)
  const finished = Math.min(Math.floor(sec / 2), total)
  const status: SyncJob['status'] = sec < 1 ? 'queued' : finished < total ? 'running' : 'done'
  const iso = (ms: number) => new Date(ms).toISOString()
  return {
    id,
    status,
    request_count: Math.min(j.req.max_requests, Math.round(sec * 2)),
    max_requests: j.req.max_requests,
    result: {
      items: targets.slice(0, finished).map((repository, i) => ({
        repository,
        status: 'done',
        new_versions: (i % 3) + 1,
        commit_sha: '9c1e0f2',
        completed_units: 4,
        total_units: 4,
        resume_required: false,
      })),
      discovery_errors: [],
    },
    error: null,
    created_at: iso(j.created),
    updated_at: iso(Date.now()),
    expires_at: iso(j.created + 5 * 60_000),
  }
}
