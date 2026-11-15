// 백엔드 API 호출. 경로는 배포 서버(be-production…railway.app/docs) 기준이고,
// 서버에 아직 없는 것은 [요청]으로 표시했다 (docs/backend-api-requests.md).
// 응답은 backend/adapt.ts에서 화면 모양으로 바꿔서 돌려준다. 목 서버(MSW)와 배포 서버 응답을 둘 다 받는다.
import { ApiError, newIdempotencyKey, request } from './client'
import { clearSession, setSession } from './session'
import * as A from './backend/adapt'
import type * as B from './backend/types'
import type { CatalogCandidateList, CatalogSource, Health, RefreshSchedule, RefreshState, SyncJob, SyncRequest } from '../types/catalog'
import type { DecisionBody, ProfileInput, ProjectPatch, RollbackBody, StartComparisonBody, WorkMethodInput } from '../types/api'

/** 응답이 없으면 null (아직 스캔·등록 전, 서버에 아직 없는 API, 서버 꺼짐) */
async function orNull<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 405 || e.status === 0)) return null
    throw e
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** 배포 서버의 비동기 작업(202)을 끝날 때까지 기다린다. 연결 프로그램이 실제 일을 하므로 시간이 걸린다 */
async function waitFor<T>(fetchOnce: () => Promise<T>, done: (v: T) => boolean, timeoutMs = 90_000): Promise<T> {
  const until = Date.now() + timeoutMs
  for (;;) {
    const v = await fetchOnce()
    if (done(v)) return v
    if (Date.now() > until) throw new ApiError(504, 'AGENT_TIMEOUT', '연결 프로그램이 응답하지 않아요. 켜져 있는지 확인해 주세요.')
    await sleep(1500)
  }
}

const isJob = (v: B.BEnvironment | B.BJobStatus): v is B.BJobStatus => 'job_id' in v && !('scan_root' in v)
const failedJob = (j: B.BJobStatus) => /fail|error|cancel/i.test(j.status)

/** 배포 서버가 받는 읽기 범위만 보낸다 (쓰기 권한은 스캔 범위가 아님) */
const SCOPES: B.BScope[] = ['config', 'skills', 'code']
const toScopes = (list: string[] | undefined): B.BScope[] => (list ?? SCOPES).filter((s): s is B.BScope => (SCOPES as string[]).includes(s))

const get = {
  agent: () => request<B.BAgent>('/api/agent'),
  /** 스캔이 끝나지 않았으면 작업 상태가 온다. 끝날 때까지 기다려 환경을 돌려준다 */
  environment: async () => {
    const first = await request<B.BEnvironment | B.BJobStatus>('/api/environment')
    if (!isJob(first)) return first
    const last = await waitFor(
      () => request<B.BEnvironment | B.BJobStatus>(`/api/environment?job_id=${encodeURIComponent(first.job_id)}`),
      (v) => !isJob(v) || failedJob(v),
    )
    if (isJob(last)) throw new ApiError(500, 'SCAN_FAILED', '환경을 읽지 못했어요. 폴더 경로와 연결 프로그램을 확인해 주세요.')
    return last
  },
  workMethods: () => request<B.BWorkMethod[]>('/api/work-methods'),
  recommendations: (includeHidden = false) => request<B.BRecommendationList>(`/api/recommendations${includeHidden ? '?include_hidden=true' : ''}`),
  candidate: (id: string) => request<B.BCandidate>(`/api/candidates/${id}`),
  comparison: (id: string) => request<B.BComparison>(`/api/comparisons/${id}`),
  apply: (id: string) => request<B.BApplyResult>(`/api/apply/${id}`),
}

/** 스캔 작업이 끝날 때까지 기다린다 */
async function waitScan(jobId: string) {
  const last = await waitFor(
    () => request<B.BEnvironment | B.BJobStatus>(`/api/environment?job_id=${encodeURIComponent(jobId)}`),
    (v) => !isJob(v) || failedJob(v),
  )
  if (isJob(last)) throw new ApiError(500, 'SCAN_FAILED', '환경을 읽지 못했어요. 폴더 경로와 연결 프로그램을 확인해 주세요.')
  return last
}

/** 스캔 요청. 서버는 30초 안에 끝나면 환경을, 아니면 504와 job_id를 준다. 그때는 이어서 기다린다 */
async function scan(root: string, scopes: string[] | undefined) {
  try {
    const res = await request<B.BEnvironment | B.BJobStatus>('/api/environment/scan', {
      method: 'POST',
      body: { root, scopes: toScopes(scopes) } satisfies B.BScanInput,
    })
    return isJob(res) ? waitScan(res.job_id) : res
  } catch (e) {
    const jobId = e instanceof ApiError && e.code === 'AGENT_TIMEOUT' ? (e.details?.job_id as string | undefined) : undefined
    if (jobId) return waitScan(jobId)
    throw e
  }
}

/** 입력 등록: PC가 고른 파일을 다 읽을 때까지(input_sha256이 생길 때까지) 기다린다. 그 전에 비교를 만들면 거절된다 */
async function registerInput(paths: string[], task: B.BTask) {
  const first = await request<B.BInputCreated>('/api/inputs', { method: 'POST', body: { relative_paths: paths, task_type: task } satisfies B.BInputCreate })
  if (first.input_sha256 || first.manifest_sha256 || !first.job_id) return first.input_id
  await waitFor(
    () => request<B.BInputCreated>(`/api/inputs/${first.input_id}`),
    (v) => !!v.input_sha256,
  )
  return first.input_id
}

/** 적용·복원 작업이 끝날 때까지 기다린다 */
/** 배포 서버는 rollback_queued처럼 앞에 이름이 붙은 진행 상태도 준다 */
const settled = (s: string) => !/(queued|pending|running|applying|rolling_back|in_progress)$/.test(s)
const waitApply = (id: string, first: B.BApplyResult) =>
  settled(first.status)
    ? Promise.resolve(first)
    : waitFor(
        () => get.apply(id),
        (r) => settled(r.status),
      )

/** 비교·후보에 추천 id가 없으면(배포 서버) 추천 목록에서 찾는다 */
async function recommendationFor(candidateVersionId: string) {
  const list = await orNull(get.recommendations(true))
  return list?.items.find((r) => r.candidate_version_id === candidateVersionId)
}

export const api = {
  // ── 로그인 ──
  getMe: () => orNull(request<B.BMe>('/api/auth/me')),
  /** 회원가입하고 바로 로그인한다 */
  signup: async (username: string, password: string) => {
    const res = await request<B.BSessionIssued>('/api/auth/signup', { method: 'POST', body: { username, password } })
    setSession(res.token)
    return res
  },
  login: async (username: string, password: string) => {
    const res = await request<B.BSessionIssued>('/api/auth/login', { method: 'POST', body: { username, password } })
    setSession(res.token)
    return res
  },
  logout: async () => {
    await orNull(request<void>('/api/auth/logout', { method: 'POST' }))
    clearSession()
  },

  // ── 연결 프로그램 (docs/agent-design.md) ──
  getAgent: async () => A.toAgent(await orNull(get.agent())),
  createPairingCode: async () => {
    const p = await request<B.BPairingCode>('/api/agent/pairing-code', { method: 'POST' })
    // 연결 명령은 서버 주소와 폴더가 들어가야 해서 화면(lib/agentCommands)에서 만든다
    return p
  },
  disconnectAgent: () => request<void>('/api/agent', { method: 'DELETE' }),
  /** 연결된 PC 목록 (기본 기기가 맨 위) */
  getDevices: async () => ((await orNull(request<B.BDeviceList>('/api/agent/devices'))) ?? { devices: [] }).devices,
  /** 스캔·비교·적용을 이 PC로 보낸다 */
  setPrimaryDevice: (deviceId: string) => request<void>(`/api/agent/devices/${encodeURIComponent(deviceId)}/primary`, { method: 'PUT' }),

  // ── F01 프로필·환경 ──
  /** 404면 아직 온보딩 전. 서버가 꺼져 있으면 오류를 그대로 던진다 */
  getProfile: async () => {
    try {
      return A.toProfile(await request<B.BProfile>('/api/profile'))
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null
      throw e
    }
  },
  saveProfile: (body: ProfileInput) => request<B.BProfileSaved>('/api/profile', { method: 'PUT', body: A.fromProfile(body) }),

  getProject: async () => {
    const [e, h] = await Promise.all([orNull(get.environment()), orNull(get.agent())])
    return A.toProject(e, null, h)
  },
  /** 폴더·접근 범위를 바꾸면 그 범위로 다시 스캔한다 */
  updateProject: async (body: ProjectPatch) => {
    await scan(body.work_dir, body.access_scope)
    return api.getProject()
  },

  getEnvironment: async () => A.toEnvironment(await get.environment()),
  /** 다시 스캔하고 이전 스캔과 비교해 바뀐 항목을 돌려준다 (FR-03) */
  recheckEnvironment: async () => {
    const before = await orNull(get.environment())
    const after = await scan(before?.scan_root ?? '', before?.allowed_scopes ?? before?.scopes)
    return { checked_at: after.scanned_at, changes: A.envDiff(before, after) }
  },

  // ── F02 작업 방식 ──
  getWorkMethods: async () => (await get.workMethods()).filter((m) => m.is_active).map(A.toWorkMethod),
  /** 비교에 쓴 고정 버전. 나중에 방식을 고쳐도 그때 버전 그대로 돌려준다 */
  getWorkMethodVersion: async (id: string, version: number) =>
    A.toWorkMethod(await request<B.BWorkMethod>(`/api/work-methods/${encodeURIComponent(id)}?version=${version}`)),
  /** 작업 유형마다 새 버전을 등록한다 */
  saveWorkMethods: async (list: WorkMethodInput[]) => {
    for (const m of list) await request<B.BWorkMethodSaved>('/api/work-methods', { method: 'POST', body: A.fromWorkMethod(m) })
    return api.getWorkMethods()
  },

  // ── F04·F05 추천·후보 ──
  getChanges: async () => (await get.recommendations()).items.filter((r) => r.status !== 'dismissed').map(A.toMatchedChange),
  getHiddenChanges: async () => (await get.recommendations(true)).items.filter((r) => r.status === 'dismissed').map(A.toMatchedChange),
  getChange: async (candidateVersionId: string) => {
    const [c, rec] = await Promise.all([get.candidate(candidateVersionId), recommendationFor(candidateVersionId)])
    return A.toChangeDetail(c, rec)
  },
  unhide: (recommendationId: string) => request<void>(`/api/recommendations/${recommendationId}`, { method: 'PATCH', body: { status: 'new' } satisfies B.BRecommendationPatch }),

  // ── F06·F07 비교 ──
  /** [요청] 배포 서버에 아직 없으면 빈 목록 */
  getActiveComparisons: async () => ((await orNull(request<B.BComparisonSummary[]>('/api/comparisons?active=true'))) ?? []).map(A.toActive),
  prepareComparison: async (candidateVersionId: string) => {
    const [c, methods] = await Promise.all([get.candidate(candidateVersionId), api.getWorkMethods()])
    const task = A.toTask((c.task_types[0] as B.BTask | undefined) ?? 'code_review')
    const method = methods.find((m) => m.task_type === task)
    if (!method) throw new ApiError(404, 'METHOD_NOT_FOUND', '이 작업 유형의 기존 작업 방식이 없어요. [설정]에서 먼저 등록해 주세요.')
    const suggestions = (await orNull(request<B.BInputSuggestion[]>(`/api/inputs/suggestions?task_type=${A.fromTask(task)}`))) ?? []
    return A.toPrep(c, method, suggestions)
  },
  /** 고른 작업마다 입력을 등록하고(POST /api/inputs) 비교를 만든다(POST /api/comparisons) */
  startComparison: async (body: StartComparisonBody) => {
    const task = A.fromTask(body.task_type)
    const inputIds: string[] = []
    for (const i of body.inputs) inputIds.push(await registerInput(i.paths, task))
    return api.createComparison({ method_id: body.method_id, method_version: body.method_version, candidate_version_id: body.candidate_id, task_type: task, input_ids: inputIds })
  },
  createComparison: async (b: Omit<B.BComparisonCreate, 'confirmed_upload_scope' | 'idempotency_key'>) => {
    const key = newIdempotencyKey()
    const res = await request<B.BComparisonCreated>('/api/comparisons', {
      method: 'POST',
      idempotencyKey: key,
      body: { ...b, confirmed_upload_scope: true, idempotency_key: key } satisfies B.BComparisonCreate,
    })
    return { id: res.comparison_id }
  },
  /** 비교 결과에 후보의 출처·권한 정보와 추천 id를 붙인다 (안전 정보 표시, AC M4) */
  getComparison: async (id: string) => {
    const c = await get.comparison(id)
    const [cand, rec] = await Promise.all([orNull(get.candidate(c.candidate_version_id)), c.recommendation_id ? null : recommendationFor(c.candidate_version_id)])
    return A.toComparison({ ...c, recommendation_id: c.recommendation_id ?? rec?.recommendation_id ?? null }, cand ?? undefined)
  },
  cancelComparison: (id: string) => request<unknown>(`/api/comparisons/${id}/cancel`, { method: 'POST' }),
  /** 같은 조건으로 다시 실행: 비교 응답의 방식·입력 그대로 새 비교를 만든다 */
  rerunComparison: async (id: string) => {
    const c = await get.comparison(id)
    if (c.method_id && c.method_version != null)
      return api.createComparison({
        method_id: c.method_id,
        method_version: c.method_version,
        candidate_version_id: c.candidate_version_id,
        task_type: c.task_type ?? (c.inputs[0]?.task_type === 'test_generation' ? 'test_generation' : 'code_review'),
        input_ids: c.inputs.map((i) => i.input_id),
      })
    // 목 서버
    return { id: (await request<B.BComparisonCreated>(`/api/comparisons/${id}/rerun`, { method: 'POST', idempotencyKey: newIdempotencyKey() })).comparison_id }
  },


  // ── F09 결정 ──
  /** 나중에·관심 없음은 추천 상태로, 기존 유지·추가 비교는 비교에 대한 사용자 선택으로 남긴다 */
  decide: async (recommendationId: string, body: DecisionBody, comparisonId?: string) => {
    if ((body.action === 'keep' || body.action === 'more_comparison') && comparisonId) {
      await api.chooseOnComparison(comparisonId, body.action === 'keep' ? 'baseline' : 'abstain', body.reason)
      if (body.action === 'keep' && recommendationId)
        await orNull(request<void>(`/api/recommendations/${recommendationId}`, { method: 'PATCH', body: { status: 'kept', reason: body.reason } }))
      return
    }
    const status = body.action === 'not_interested' ? 'dismissed' : 'snoozed'
    return request<void>(`/api/recommendations/${recommendationId}`, { method: 'PATCH', body: { status, reason: body.reason } satisfies B.BRecommendationPatch })
  },
  /** 백엔드는 이유를 1글자 이상 받아서, 비워 두면 선택 이름을 이유로 보낸다 */
  chooseOnComparison: (comparisonId: string, choice: B.BDecision['choice'], reason?: string) =>
    request<void>(`/api/comparisons/${comparisonId}/decision`, {
      method: 'PATCH',
      body: { choice, reason: reason?.trim() || { baseline: '기존 방식 유지', candidate: '후보 방식 선택', abstain: '판단 보류' }[choice] } satisfies B.BDecision,
    }),
  /** 추천 카드를 "기존 유지"로 */
  markKept: (recommendationId: string, reason?: string) => orNull(request<void>(`/api/recommendations/${recommendationId}`, { method: 'PATCH', body: { status: 'kept', reason } })),

  // ── F09·F10 적용·복원 ──
  /** 후보를 고른 것으로 남기고(설계서 수정안: 선택과 적용은 별도 단계) 미리보기를 받는다 */
  getSwitchPreview: async (comparisonId: string) => {
    // 서버는 후보를 고른 비교만 적용한다. 이미 후보를 골랐으면 다시 저장하지 않는다 (사용자가 적은 이유가 덮어써지지 않게)
    const c = await orNull(get.comparison(comparisonId))
    if (c?.verdict !== 'candidate') await orNull(api.chooseOnComparison(comparisonId, 'candidate'))
    const first = await request<B.BApplyPreview>('/api/apply/preview', { method: 'POST', body: { comparison_id: comparisonId } })
    const p = first.change_set_sha256
      ? first
      : await waitFor(
          () => request<B.BApplyPreview>(`/api/apply/preview/${first.preview_id}`),
          (v) => !!v.change_set_sha256 || /fail|error|expired/i.test(v.status ?? ''),
        )
    if (!p.change_set_sha256) throw new ApiError(500, 'PREVIEW_FAILED', '바뀔 내용을 확인하지 못했어요. 잠시 뒤 다시 열어 주세요.')
    const cand = await orNull(get.candidate(p.candidate_version_id))
    return A.toPreview(p, cand ? A.toCandidate(cand).support_level : undefined, c?.candidate_label)
  },
  startSwitch: async ({ comparisonId, previewId, token }: { comparisonId: string; previewId: string; token: string }) => {
    const first = await request<B.BApplyResult>('/api/apply', {
      method: 'POST',
      idempotencyKey: newIdempotencyKey(),
      body: { preview_id: previewId, change_set_sha256: token } satisfies B.BApplyInput,
    })
    return A.toSwitch(await waitApply(first.apply_id, first), comparisonId)
  },
  /** 충돌이면 CONFLICT 오류로 바꿔서 던진다 (TC-11) */
  rollback: async (applyId: string, body: RollbackBody) => {
    const reason = body.reason === 'other' ? (body.note ?? '기타') : body.reason
    const first = await request<B.BRollbackResult & Partial<B.BApplyResult>>(`/api/apply/${applyId}/rollback`, {
      method: 'POST',
      body: { confirmed: true, reason, conflict_strategy: body.conflict_strategy } satisfies B.BRollbackInput,
    })
    // 되돌리기 작업이 끝나면 서버가 rolled_back(또는 conflict·실패)으로 바꾼다. 그 전엔 applied로 보일 수 있다
    const done = (r: { status: string; job_status?: string | null }) =>
      r.status === 'rolled_back' || r.status === 'conflict' || /fail/.test(r.status) || /fail/.test(r.job_status ?? '')
    const res = done(first) ? first : await waitFor(() => get.apply(applyId), done)
    if (res.status === 'conflict') throw new ApiError(409, 'CONFLICT', res.reason ?? '적용 이후 직접 바꾼 파일이 있어요', { paths: res.conflict_paths })
    if (res.status !== 'rolled_back') throw new ApiError(500, 'ROLLBACK_FAILED', res.reason ?? '되돌리지 못했어요. 잠시 뒤 다시 시도해 주세요.')
    return res
  },

  // ── F11 이력 ──
  getHistory: async () => {
    const res = await request<B.BHistory | B.BHistoryEvent[]>('/api/history')
    return (Array.isArray(res) ? res : res.items).map(A.toHistory)
  },

  // ── 서버 상태 ──
  /** API와 DB가 준비됐는지. 마이그레이션이 안 됐으면 503 migration_required */
  getHealth: () => request<Health>('/api/health'),

  // ── 후보 둘러보기 (서버가 공개 저장소에서 찾은 후보) ──
  getCatalogCandidates: (p: { kind?: 'skill' | 'repo'; limit: number; offset?: number }) => {
    const q = new URLSearchParams({ limit: String(p.limit), offset: String(p.offset ?? 0) })
    if (p.kind) q.set('kind', p.kind)
    return request<CatalogCandidateList>(`/api/catalog/candidates?${q}`)
  },
  getCatalogSources: async () => (await request<{ items: CatalogSource[] }>('/api/catalog/sources')).items,

  // ── 후보 수집 관리 (운영자) ──
  getRefreshState: () => request<RefreshState>('/api/catalog/refresh', { operator: true }),
  saveSchedule: (s: RefreshSchedule) => request<RefreshSchedule>('/api/catalog/refresh/schedule', { method: 'PUT', body: s, operator: true }),
  startSync: (body: SyncRequest) =>
    request<SyncJob>('/api/catalog/sync', { method: 'POST', body, operator: true, idempotencyKey: newIdempotencyKey() }),
  getSyncJob: (id: string) => request<SyncJob>(`/api/catalog/jobs/${encodeURIComponent(id)}`, { operator: true }),
}
