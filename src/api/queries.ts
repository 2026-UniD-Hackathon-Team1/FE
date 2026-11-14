import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './endpoints'
import type { ComparisonStatus } from '../types/domain'
import type { RefreshSchedule, SyncJob, SyncRequest } from '../types/catalog'
import type { DecisionBody, ProfileInput, ProjectPatch, RollbackBody, StartComparisonBody, WorkMethodInput } from '../types/api'

/** 설계서 12.2: 상태 조회 1~2초 간격 */
const POLL_MS = 2000

const TERMINAL: ComparisonStatus[] = ['done', 'failed', 'timeout', 'cancelled']
export const isTerminal = (s: ComparisonStatus | undefined) => !!s && TERMINAL.includes(s)

export const qk = {
  me: ['me'] as const,
  profile: ['profile'] as const,
  project: ['project'] as const,
  agent: ['agent'] as const,
  devices: ['agent', 'devices'] as const,
  environment: ['environment'] as const,
  workMethods: ['work-methods'] as const,
  changes: ['changes'] as const,
  hidden: ['changes', 'hidden'] as const,
  change: (id: string) => ['changes', id] as const,
  comparison: (id: string) => ['comparisons', id] as const,
  active: ['comparisons', 'active'] as const,
  switchPreview: (id: string) => ['switch-preview', id] as const,
  history: ['history'] as const,
  health: ['health'] as const,
  catalog: (kind: string, limit: number) => ['catalog', 'candidates', kind, limit] as const,
  sources: ['catalog', 'sources'] as const,
  refresh: ['catalog', 'refresh'] as const,
  syncJob: (id: string) => ['catalog', 'jobs', id] as const,
  methodVersion: (id: string, v: number) => ['work-methods', id, v] as const,
}

// ── 연결 프로그램·프로필·환경 ───────────────────────────────

/** 연결 프로그램이 켜져 있는지. 꺼져 있으면 비교·바꾸기를 막는다. 온보딩에서 연결을 기다릴 땐 2초마다 */
export const useAgent = (fast = false) =>
  useQuery({
    queryKey: qk.agent,
    queryFn: api.getAgent,
    refetchInterval: fast ? 2000 : 15_000,
  })

/** 연결된 PC 목록 */
export const useDevices = () => useQuery({ queryKey: qk.devices, queryFn: api.getDevices, refetchInterval: 15_000 })

/** 작업을 보낼 기본 PC 바꾸기 */
export function useSetPrimaryDevice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (deviceId: string) => api.setPrimaryDevice(deviceId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.agent }),
  })
}

/** 온보딩 [연결 명령 받기] */
export const usePairingCode = () => useMutation({ mutationFn: api.createPairingCode })

/** 로그인한 내 정보 (사이드바) */
export const useMe = () => useQuery({ queryKey: qk.me, queryFn: api.getMe, staleTime: 5 * 60_000 })

/** null이면 아직 온보딩 전 */
export const useProfile = () => useQuery({ queryKey: qk.profile, queryFn: api.getProfile, retry: false })

export function useSaveProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ProfileInput) => api.saveProfile(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.profile })
      void qc.invalidateQueries({ queryKey: qk.changes })
    },
  })
}

export const useProject = () => useQuery({ queryKey: qk.project, queryFn: api.getProject })

export function useUpdateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ProjectPatch) => api.updateProject(body),
    onSuccess: (p) => {
      qc.setQueryData(qk.project, p)
      void qc.invalidateQueries({ queryKey: qk.environment })
      void qc.invalidateQueries({ queryKey: qk.changes })
    },
  })
}

export const useEnvironment = () =>
  useQuery({
    queryKey: qk.environment,
    queryFn: api.getEnvironment,
    retry: false,
  })

export function useRecheckEnvironment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.recheckEnvironment,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.environment })
      void qc.invalidateQueries({ queryKey: qk.changes })
    },
  })
}

export const useWorkMethods = () => useQuery({ queryKey: qk.workMethods, queryFn: api.getWorkMethods })

/** 비교에 쓴 작업 방식의 고정 버전. 팝업을 열 때만 불러온다 */
export const useWorkMethodVersion = (m: { id: string; version: number } | null | undefined, enabled: boolean) =>
  useQuery({
    queryKey: qk.methodVersion(m?.id ?? '', m?.version ?? 0),
    queryFn: () => api.getWorkMethodVersion(m!.id, m!.version),
    enabled: enabled && !!m,
    staleTime: Infinity, // 고정 버전이라 바뀌지 않는다
  })

export function useSaveWorkMethods() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: WorkMethodInput[]) => api.saveWorkMethods(body),
    onSuccess: (list) => {
      qc.setQueryData(qk.workMethods, list)
      void qc.invalidateQueries({ queryKey: qk.changes })
    },
  })
}

export function useDisconnect() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.disconnectAgent,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.agent })
      void qc.invalidateQueries({ queryKey: qk.project })
      void qc.invalidateQueries({ queryKey: qk.environment })
    },
  })
}

// ── 추천·후보 ────────────────────────────────────────────

export const useChanges = () => useQuery({ queryKey: qk.changes, queryFn: api.getChanges })
export const useHiddenChanges = (enabled: boolean) => useQuery({ queryKey: qk.hidden, queryFn: api.getHiddenChanges, enabled })
export const useChange = (id: string) => useQuery({ queryKey: qk.change(id), queryFn: () => api.getChange(id) })

export function useUnhide() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (recommendationId: string) => api.unhide(recommendationId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.changes }),
  })
}

/** 결정 기록. 기존 유지·추가 비교는 비교 ID가 있으면 그 비교에 대한 결정으로 남긴다 */
export function useDecision(recommendationId: string, comparisonId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: DecisionBody) => api.decide(recommendationId, body, comparisonId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.changes })
      void qc.invalidateQueries({ queryKey: qk.history })
    },
  })
}

/** 비교 결과에서 고르기 (설계서 수정안). 기존 유지를 고르면 추천 카드도 "기존 유지"로 남긴다.
 *  후보를 골라도 바로 바뀌지 않고, 교체 확인에서 따로 적용한다 */
export function useChoose(comparisonId: string, recommendationId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ choice, reason }: { choice: 'baseline' | 'candidate' | 'abstain'; reason?: string }) => {
      await api.chooseOnComparison(comparisonId, choice, reason)
      if (choice === 'baseline' && recommendationId) await api.markKept(recommendationId, reason)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.comparison(comparisonId) })
      void qc.invalidateQueries({ queryKey: qk.changes })
      void qc.invalidateQueries({ queryKey: qk.history })
    },
  })
}

// ── 비교 ────────────────────────────────────────────────

export const useComparison = (id: string) =>
  useQuery({
    queryKey: qk.comparison(id),
    queryFn: () => api.getComparison(id),
    refetchInterval: (q) => (isTerminal(q.state.data?.status) ? false : POLL_MS),
  })

/** 홈의 "진행 중인 비교". 실행 중인 것이 있으면 2초마다 다시 본다 */
export const useActiveComparisons = () =>
  useQuery({
    queryKey: qk.active,
    queryFn: api.getActiveComparisons,
    staleTime: 0,
    refetchInterval: (q) => (q.state.data?.some((c) => !isTerminal(c.status)) ? POLL_MS : false),
  })

export const usePrepareComparison = (candidateId: string) =>
  useQuery({
    queryKey: ['prepare', candidateId],
    queryFn: () => api.prepareComparison(candidateId),
    enabled: !!candidateId,
    retry: false,
  })

export function useStartComparison() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: StartComparisonBody) => api.startComparison(body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.active }),
  })
}

export function useCancelComparison(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.cancelComparison(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.comparison(id) }),
  })
}

export function useRerunComparison() {
  return useMutation({ mutationFn: (id: string) => api.rerunComparison(id) })
}

// ── 적용·복원·이력 ──────────────────────────────────────

export const useSwitchPreview = (comparisonId: string) =>
  useQuery({
    queryKey: qk.switchPreview(comparisonId),
    queryFn: () => api.getSwitchPreview(comparisonId),
    staleTime: 0,
    gcTime: 0,
  })

export function useStartSwitch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { comparisonId: string; previewId: string; token: string }) => api.startSwitch(v),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.history })
      void qc.invalidateQueries({ queryKey: qk.changes })
      void qc.invalidateQueries({ queryKey: qk.project })
      void qc.invalidateQueries({ queryKey: qk.environment })
    },
  })
}

export function useRollback() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ switchId, body }: { switchId: string; body: RollbackBody }) => api.rollback(switchId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.history })
      void qc.invalidateQueries({ queryKey: qk.changes })
      void qc.invalidateQueries({ queryKey: qk.environment })
    },
  })
}

export const useHistory = () => useQuery({ queryKey: qk.history, queryFn: api.getHistory })

// ── 서버 상태 ──────────────────────────────────────────

/** API와 DB 준비 상태. 실패해도 다시 시도하지 않고 바로 보여준다 */
export const useHealth = () => useQuery({ queryKey: qk.health, queryFn: api.getHealth, retry: false, refetchInterval: 60_000 })

// ── 후보 둘러보기 · 수집 관리 ─────────────────────────────

export const useCatalogCandidates = (kind: 'skill' | 'repo' | 'all', limit: number) =>
  useQuery({
    queryKey: qk.catalog(kind, limit),
    queryFn: () => api.getCatalogCandidates({ kind: kind === 'all' ? undefined : kind, limit }),
    placeholderData: (prev) => prev, // [더 보기]를 눌러도 목록이 깜빡이지 않게
  })

export const useCatalogSources = () => useQuery({ queryKey: qk.sources, queryFn: api.getCatalogSources })

export const useRefreshState = (enabled = true) => useQuery({ queryKey: qk.refresh, queryFn: api.getRefreshState, enabled, retry: false })

export function useSaveSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (s: RefreshSchedule) => api.saveSchedule(s),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.refresh }),
  })
}

export const useStartSync = () => useMutation({ mutationFn: (body: SyncRequest) => api.startSync(body) })

const SYNC_RUNNING: SyncJob['status'][] = ['queued', 'running']
/** 수집 작업 진행 상황. 끝날 때까지 2초마다 */
export function useSyncJob(id: string | null) {
  const qc = useQueryClient()
  return useQuery({
    queryKey: qk.syncJob(id ?? ''),
    queryFn: async () => {
      const j = await api.getSyncJob(id!)
      // 끝나면 후보 목록·소스·요청량을 새로 받는다
      if (!SYNC_RUNNING.includes(j.status)) void qc.invalidateQueries({ queryKey: ['catalog'], predicate: (q) => q.queryKey[1] !== 'jobs' })
      return j
    },
    enabled: !!id,
    refetchInterval: (q) => (q.state.data && !SYNC_RUNNING.includes(q.state.data.status) ? false : POLL_MS),
  })
}
