import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './endpoints'
import type { ComparisonStatus, FindingVerification } from '../types/domain'
import type { DecisionBody, EnvItemInput, ProfileInput, ProjectPatch, RollbackBody, StartComparisonBody, WorkMethodInput } from '../types/api'

/** 설계서 12.2: 상태 조회 1~2초 간격 */
const POLL_MS = 2000

const TERMINAL: ComparisonStatus[] = ['done', 'failed', 'timeout', 'cancelled']
export const isTerminal = (s: ComparisonStatus | undefined) => !!s && TERMINAL.includes(s)

export const qk = {
  profile: ['profile'] as const,
  project: ['project'] as const,
  agent: ['agent'] as const,
  environment: ['environment'] as const,
  workMethods: ['work-methods'] as const,
  changes: ['changes'] as const,
  hidden: ['changes', 'hidden'] as const,
  change: (id: string) => ['changes', id] as const,
  comparison: (id: string) => ['comparisons', id] as const,
  active: ['comparisons', 'active'] as const,
  switchPreview: (id: string) => ['switch-preview', id] as const,
  history: ['history'] as const,
}

// ── 연결 프로그램·프로필·환경 ───────────────────────────────

/** 연결 프로그램이 켜져 있는지. 꺼져 있으면 비교·바꾸기를 막는다. 온보딩에서 연결을 기다릴 땐 2초마다 */
export const useAgent = (fast = false) =>
  useQuery({
    queryKey: qk.agent,
    queryFn: api.getAgent,
    refetchInterval: fast ? 2000 : 15_000,
  })

/** 온보딩 [연결 명령 받기] */
export const usePairingCode = () => useMutation({ mutationFn: api.createPairingCode })

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

export function useAddEnvItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: EnvItemInput) => api.addEnvItem(body),
    onSuccess: (env) => qc.setQueryData(qk.environment, env),
  })
}

export function useUpdateEnvItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ name, body }: { name: string; body: EnvItemInput }) => api.updateEnvItem(name, body),
    onSuccess: (env) => {
      qc.setQueryData(qk.environment, env)
      void qc.invalidateQueries({ queryKey: qk.changes })
    },
  })
}

export const useWorkMethods = () => useQuery({ queryKey: qk.workMethods, queryFn: api.getWorkMethods })

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

export function useDeleteData() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (kind: 'comparisons' | 'backups') => api.deleteData(kind),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.project }),
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

export function useUpdateFinding(comparisonId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, verification, note }: { id: string; verification: FindingVerification; note?: string }) => api.updateFinding(id, { verification, user_note: note }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.comparison(comparisonId) }),
  })
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
