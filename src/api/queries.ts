import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './endpoints'
import type { ComparisonStatus } from '../types/domain'
import type { DecisionBody, RollbackBody, StartComparisonBody } from '../types/api'

/** MVP는 프로젝트 1개. 로그인 방식(D-04) 확정 전까지 고정 */
export const CURRENT_PROJECT_ID = 'prj_001'

/** 명세 8장: 비교 상태 2초 간격 조회 */
const COMPARISON_POLL_MS = 2000

const TERMINAL: ComparisonStatus[] = ['done', 'failed', 'timeout', 'cancelled']
export const isTerminal = (s: ComparisonStatus | undefined) => !!s && TERMINAL.includes(s)

export const qk = {
  environment: (projectId: string) => ['environment', projectId] as const,
  workMethods: (projectId: string) => ['work-methods', projectId] as const,
  changes: ['changes'] as const,
  change: (id: string) => ['changes', id] as const,
  comparison: (id: string) => ['comparisons', id] as const,
  history: ['history'] as const,
}

export const useEnvironment = (projectId = CURRENT_PROJECT_ID) =>
  useQuery({ queryKey: qk.environment(projectId), queryFn: () => api.getEnvironment(projectId) })

export const useWorkMethods = (projectId = CURRENT_PROJECT_ID) =>
  useQuery({ queryKey: qk.workMethods(projectId), queryFn: () => api.getWorkMethods(projectId) })

export const useChanges = () => useQuery({ queryKey: qk.changes, queryFn: () => api.getChanges() })

export const useChange = (id: string) =>
  useQuery({ queryKey: qk.change(id), queryFn: () => api.getChange(id) })

export const useComparison = (id: string) =>
  useQuery({
    queryKey: qk.comparison(id),
    queryFn: () => api.getComparison(id),
    refetchInterval: (q) => (isTerminal(q.state.data?.status) ? false : COMPARISON_POLL_MS),
  })

export const useHistory = () => useQuery({ queryKey: qk.history, queryFn: api.getHistory })

export function useStartComparison() {
  return useMutation({ mutationFn: (body: StartComparisonBody) => api.startComparison(body) })
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

export function useStartSwitch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (comparisonId: string) =>
      api.startSwitch({ comparison_id: comparisonId, confirmed: true }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.history })
      void qc.invalidateQueries({ queryKey: qk.changes })
    },
  })
}

export function useRollback() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ switchId, body }: { switchId: string; body: RollbackBody }) =>
      api.rollback(switchId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.history })
      void qc.invalidateQueries({ queryKey: qk.changes })
    },
  })
}
