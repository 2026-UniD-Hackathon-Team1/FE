import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './endpoints'
import type { ComparisonStatus, FindingVerification } from '../types/domain'
import type { DecisionBody, EnvItemInput, RollbackBody, StartComparisonBody } from '../types/api'

/** MVP는 프로젝트 1개 */
export const CURRENT_PROJECT_ID = 'prj_001'

/** 명세 8장 / D-07: 상태 조회 2초 간격 */
const POLL_MS = 2000

const TERMINAL: ComparisonStatus[] = ['done', 'failed', 'timeout', 'cancelled']
export const isTerminal = (s: ComparisonStatus | undefined) => !!s && TERMINAL.includes(s)

export const qk = {
  me: ['me'] as const,
  project: (id: string) => ['project', id] as const,
  agent: (id: string) => ['agent', id] as const,
  environment: (id: string) => ['environment', id] as const,
  workMethods: (id: string) => ['work-methods', id] as const,
  changes: ['changes'] as const,
  hidden: ['changes', 'hidden'] as const,
  change: (id: string) => ['changes', id] as const,
  comparison: (id: string) => ['comparisons', id] as const,
  switchPreview: (id: string) => ['switch-preview', id] as const,
  history: ['history'] as const,
}

export const useMe = () => useQuery({ queryKey: qk.me, queryFn: api.getMe, retry: false })

export const useProject = (id = CURRENT_PROJECT_ID) => useQuery({ queryKey: qk.project(id), queryFn: () => api.getProject(id) })

/** 연결 프로그램 상태. waiting이면 2초마다 다시 본다 */
export const useAgent = (id = CURRENT_PROJECT_ID) =>
  useQuery({
    queryKey: qk.agent(id),
    queryFn: () => api.getAgent(id),
    refetchInterval: (q) => (q.state.data?.status === 'waiting' ? POLL_MS : 15_000),
  })

export function useAgentCode(id = CURRENT_PROJECT_ID) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.createAgentCode(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.agent(id) }),
  })
}

export const useEnvironment = (id = CURRENT_PROJECT_ID) =>
  useQuery({ queryKey: qk.environment(id), queryFn: () => api.getEnvironment(id), retry: false })

export function useRecheckEnvironment(id = CURRENT_PROJECT_ID) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.recheckEnvironment(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.environment(id) })
      void qc.invalidateQueries({ queryKey: qk.changes })
    },
  })
}

export function useAddEnvItem(id = CURRENT_PROJECT_ID) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: EnvItemInput) => api.addEnvItem(id, body),
    onSuccess: (env) => qc.setQueryData(qk.environment(id), env),
  })
}

export const useWorkMethods = (id = CURRENT_PROJECT_ID) =>
  useQuery({ queryKey: qk.workMethods(id), queryFn: () => api.getWorkMethods(id) })

export const useChanges = () => useQuery({ queryKey: qk.changes, queryFn: api.getChanges })
export const useHiddenChanges = (enabled: boolean) =>
  useQuery({ queryKey: qk.hidden, queryFn: api.getHiddenChanges, enabled })
export const useChange = (id: string) => useQuery({ queryKey: qk.change(id), queryFn: () => api.getChange(id) })

export function useUnhide() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (matchId: string) => api.unhide(matchId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.changes }),
  })
}

export const useComparison = (id: string) =>
  useQuery({
    queryKey: qk.comparison(id),
    queryFn: () => api.getComparison(id),
    refetchInterval: (q) => (isTerminal(q.state.data?.status) ? false : POLL_MS),
  })

export const usePrepareComparison = (candidateId: string, matchId: string) =>
  useQuery({
    queryKey: ['prepare', candidateId, matchId],
    queryFn: () => api.prepareComparison(candidateId, matchId),
    enabled: !!candidateId && !!matchId,
  })

export function useStartComparison() {
  return useMutation({ mutationFn: (body: StartComparisonBody) => api.startComparison(body) })
}

export function useCancelComparison(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.cancelComparison(id),
    onSuccess: (c) => qc.setQueryData(qk.comparison(id), c),
  })
}

export function useRerunComparison() {
  return useMutation({ mutationFn: (id: string) => api.rerunComparison(id) })
}

export function useUpdateFinding(comparisonId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, verification, note }: { id: string; verification: FindingVerification; note?: string }) =>
      api.updateFinding(id, { verification, user_note: note }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.comparison(comparisonId) }),
  })
}

export function useDecision(matchId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: DecisionBody) => api.decide(matchId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.changes })
      void qc.invalidateQueries({ queryKey: qk.history })
    },
  })
}

export const useSwitchPreview = (comparisonId: string) =>
  useQuery({ queryKey: qk.switchPreview(comparisonId), queryFn: () => api.getSwitchPreview(comparisonId) })

export function useStartSwitch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (comparisonId: string) => api.startSwitch({ comparison_id: comparisonId, confirmed: true }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.history })
      void qc.invalidateQueries({ queryKey: qk.changes })
      void qc.invalidateQueries({ queryKey: qk.project(CURRENT_PROJECT_ID) })
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
    },
  })
}

export function useDisconnect(id = CURRENT_PROJECT_ID) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.disconnectProject(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.agent(id) })
      void qc.invalidateQueries({ queryKey: qk.project(id) })
    },
  })
}

export function useDeleteData(id = CURRENT_PROJECT_ID) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (kind: 'comparisons' | 'backups') => api.deleteData(id, kind),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.project(id) }),
  })
}

export const useHistory = () => useQuery({ queryKey: qk.history, queryFn: api.getHistory })
