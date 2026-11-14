// 백엔드 API 호출. 경로는 「갈아탈까 해커톤 MVP 구현 설계서」 12장 기준이고,
// 설계서에 없는 것은 [요청]으로 표시했다 (docs/backend-api-requests.md).
// 응답은 backend/adapt.ts에서 화면 모양으로 바꿔서 돌려준다.
import { ApiError, newIdempotencyKey, request } from './client'
import * as A from './backend/adapt'
import type * as B from './backend/types'
import type { FindingVerification } from '../types/domain'
import type { DecisionBody, EnvItemInput, ProfileInput, ProjectPatch, RollbackBody, StartComparisonBody, WorkMethodInput } from '../types/api'

/** 응답이 없으면 null (아직 스캔·등록 전이거나 서버가 꺼짐) */
async function orNull<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 0)) return null
    throw e
  }
}

const get = {
  agent: () => request<B.BAgent>('/api/agent'), // [요청] docs/agent-design.md
  environment: () => request<B.BEnvironment>('/api/environment'), // [요청]
  storage: () => request<B.BStorage>('/api/storage'), // [요청]
  workMethods: () => request<B.BWorkMethod[]>('/api/work-methods'), // [요청]
  recommendations: (status?: string) => request<B.BRecommendationList>(`/api/recommendations${status ? `?status=${status}` : ''}`),
  candidate: (id: string) => request<B.BCandidate>(`/api/candidates/${id}`),
  comparison: (id: string) => request<B.BComparison>(`/api/comparisons/${id}`),
}

export const api = {
  // ── 연결 프로그램 [요청] docs/agent-design.md ──
  getAgent: async () => A.toAgent(await orNull(get.agent())),
  createPairingCode: () => request<B.BPairingCode>('/api/agent/pairing-code', { method: 'POST' }),
  disconnectAgent: () => request<void>('/api/agent', { method: 'DELETE' }),

  // ── F01 프로필·환경 ──
  /** 404면 아직 온보딩 전. 서버가 꺼져 있으면 오류를 그대로 던진다 */
  getProfile: async () => {
    try {
      return A.toProfile(await request<B.BProfile>('/api/profile')) // [요청]
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null
      throw e
    }
  },
  saveProfile: (body: ProfileInput) =>
    request<B.BProfileSaved>('/api/profile', {
      method: 'PUT',
      body: A.fromProfile(body),
    }),

  getProject: async () => {
    const [e, s, h] = await Promise.all([orNull(get.environment()), orNull(get.storage()), orNull(get.agent())])
    return A.toProject(e, s, h)
  },
  /** 폴더·접근 범위를 바꾸면 그 범위로 다시 스캔한다 (설계서 POST /api/environment/scan) */
  updateProject: async (body: ProjectPatch) => {
    await request<B.BEnvironment>('/api/environment/scan', {
      method: 'POST',
      body: {
        root: body.work_dir,
        scopes: body.access_scope,
      } satisfies B.BScanInput,
    })
    return api.getProject()
  },
  deleteData: (kind: 'comparisons' | 'backups') => request<void>(`/api/storage?kind=${kind}`, { method: 'DELETE' }), // [요청]

  getEnvironment: async () => A.toEnvironment(await get.environment()),
  /** 다시 스캔하고 이전 스캔과 비교해 바뀐 항목을 돌려준다 (FR-03) */
  recheckEnvironment: async () => {
    const before = await orNull(get.environment())
    const after = await request<B.BEnvironment>('/api/environment/scan', {
      method: 'POST',
      body: {
        root: before?.scan_root ?? '',
        scopes: before?.allowed_scopes,
      } satisfies B.BScanInput,
    })
    return { checked_at: after.scanned_at, changes: A.envDiff(before, after) }
  },
  addEnvItem: async (body: EnvItemInput) =>
    A.toEnvironment(
      await request<B.BEnvironment>('/api/environment/items', {
        method: 'POST',
        body: A.fromEnvItem(body),
      }),
    ), // [요청]
  updateEnvItem: async (name: string, body: EnvItemInput) =>
    A.toEnvironment(await request<B.BEnvironment>(`/api/environment/items/${encodeURIComponent(name)}`, { method: 'PATCH', body: A.fromEnvItem(body) })), // [요청]

  // ── F02 작업 방식 ──
  getWorkMethods: async () => (await get.workMethods()).filter((m) => m.is_active).map(A.toWorkMethod),
  /** 작업 유형마다 새 버전을 등록한다 (설계서 POST /api/work-methods) */
  saveWorkMethods: async (list: WorkMethodInput[]) => {
    for (const m of list)
      await request<B.BWorkMethodSaved>('/api/work-methods', {
        method: 'POST',
        body: A.fromWorkMethod(m),
      })
    return api.getWorkMethods()
  },

  // ── F04·F05 추천·후보 ──
  getChanges: async () => (await get.recommendations()).items.filter((r) => r.status !== 'dismissed').map(A.toMatchedChange),
  getHiddenChanges: async () => (await get.recommendations('dismissed')).items.map(A.toMatchedChange), // [요청] status 필터
  getChange: async (candidateVersionId: string) => {
    const [c, list] = await Promise.all([get.candidate(candidateVersionId), orNull(get.recommendations())])
    return A.toChangeDetail(
      c,
      list?.items.find((r) => r.candidate_version_id === candidateVersionId),
    )
  },
  unhide: (recommendationId: string) =>
    request<void>(`/api/recommendations/${recommendationId}`, {
      method: 'PATCH',
      body: { status: 'new' } satisfies B.BRecommendationPatch,
    }), // [요청]

  // ── F06·F07 비교 ──
  getActiveComparisons: async () => (await request<B.BComparisonSummary[]>('/api/comparisons?active=true')).map(A.toActive), // [요청]
  prepareComparison: async (candidateVersionId: string) => {
    const [c, methods] = await Promise.all([get.candidate(candidateVersionId), api.getWorkMethods()])
    const task = A.toTask(c.task_types[0] ?? 'code_review')
    const method = methods.find((m) => m.task_type === task)
    if (!method) throw new ApiError(404, 'METHOD_NOT_FOUND', '이 작업 유형의 기존 작업 방식이 없어요. [설정]에서 먼저 등록해 주세요.')
    const suggestions = await request<B.BInputSuggestion[]>(`/api/inputs/suggestions?task_type=${A.fromTask(task)}`) // [요청]
    return A.toPrep(c, method, suggestions)
  },
  /** 입력을 등록하고(POST /api/inputs) 비교를 만든다(POST /api/comparisons) */
  startComparison: async (body: StartComparisonBody) => {
    const inputIds: string[] = []
    for (const i of body.inputs) {
      const created = await request<B.BInputCreated>('/api/inputs', {
        method: 'POST',
        body: {
          relative_paths: i.paths,
          label: i.label,
        } satisfies B.BInputCreate,
      })
      inputIds.push(created.input_id)
    }
    const key = newIdempotencyKey()
    const res = await request<B.BComparisonCreated>('/api/comparisons', {
      method: 'POST',
      idempotencyKey: key,
      body: {
        method_id: body.method_id,
        method_version: body.method_version,
        candidate_version_id: body.candidate_id,
        task_type: A.fromTask(body.task_type),
        input_ids: inputIds,
        confirmed_upload_scope: true,
        idempotency_key: key,
      } satisfies B.BComparisonCreate,
    })
    return { id: res.comparison_id }
  },
  /** 비교 결과에 후보의 출처·권한 정보를 붙인다 (안전 정보 표시, AC M4) */
  getComparison: async (id: string) => {
    const c = await get.comparison(id)
    const cand = await orNull(get.candidate(c.candidate_version_id))
    return A.toComparison(c, cand ?? undefined)
  },
  cancelComparison: (id: string) => request<unknown>(`/api/comparisons/${id}/cancel`, { method: 'POST' }),
  rerunComparison: async (id: string) => ({
    id: (
      await request<B.BComparisonCreated>(`/api/comparisons/${id}/rerun`, {
        method: 'POST',
        idempotencyKey: newIdempotencyKey(),
      })
    ).comparison_id,
  }), // [요청]

  // ── F08 검증 ──
  updateFinding: (id: string, body: { verification: FindingVerification; user_note?: string }) =>
    request<unknown>(`/api/findings/${id}`, {
      method: 'PATCH',
      body: {
        verification: A.fromVerification(body.verification),
        evidence: body.user_note ? { note: body.user_note } : undefined,
      } satisfies B.BFindingPatch,
    }),

  // ── F09 결정 ──
  /** 나중에·관심 없음은 추천 상태를, 기존 유지·추가 비교는 비교에 대한 결정으로 기록한다 */
  decide: (recommendationId: string, body: DecisionBody, comparisonId?: string) => {
    if ((body.action === 'keep' || body.action === 'more_comparison') && comparisonId)
      return request<void>(`/api/comparisons/${comparisonId}/decision`, {
        method: 'POST',
        body: {
          action: body.action,
          reason: body.reason,
        } satisfies B.BDecision,
      }) // [요청]
    const status = body.action === 'not_interested' ? 'dismissed' : 'snoozed'
    return request<void>(`/api/recommendations/${recommendationId}`, {
      method: 'PATCH',
      body: { status, reason: body.reason } satisfies B.BRecommendationPatch,
    }) // [요청]
  },

  // ── F09·F10 적용·복원 ──
  getSwitchPreview: async (comparisonId: string) => {
    const p = await request<B.BApplyPreview>('/api/apply/preview', {
      method: 'POST',
      body: { comparison_id: comparisonId },
    })
    const cand = await orNull(get.candidate(p.candidate_version_id))
    return A.toPreview(p, cand ? A.toCandidate(cand).support_level : undefined)
  },
  startSwitch: async ({ comparisonId, previewId, token }: { comparisonId: string; previewId: string; token: string }) =>
    A.toSwitch(
      await request<B.BApplyResult>('/api/apply', {
        method: 'POST',
        idempotencyKey: newIdempotencyKey(),
        body: {
          preview_id: previewId,
          confirmation_token: token,
        } satisfies B.BApplyInput,
      }),
      comparisonId,
    ),
  /** 충돌이면 CONFLICT 오류로 바꿔서 던진다 (TC-11) */
  rollback: async (applyId: string, body: RollbackBody) => {
    const reason = body.reason === 'other' ? (body.note ?? '기타') : body.reason
    const res = await request<B.BRollbackResult>(`/api/apply/${applyId}/rollback`, {
      method: 'POST',
      body: {
        confirmed: true,
        reason,
        conflict_strategy: body.conflict_strategy,
      } satisfies B.BRollbackInput,
    })
    if (res.status === 'conflict') throw new ApiError(409, 'CONFLICT', res.reason ?? '적용 이후 직접 바꾼 파일이 있어요', { paths: res.conflict_paths })
    return res
  },

  // ── F11 이력 ──
  getHistory: async () => (await request<B.BHistory>('/api/history')).items.map(A.toHistory),
}
