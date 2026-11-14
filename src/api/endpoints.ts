// 명세 8장 API 목록과 1:1 대응
import { request } from './client'
import type {
  Comparison,
  DecisionLog,
  Environment,
  Finding,
  FindingVerification,
  Switch,
  WorkMethod,
} from '../types/domain'
import type {
  ChangeDetail,
  DecisionBody,
  MatchedChange,
  RollbackBody,
  StartComparisonBody,
  SwitchBody,
} from '../types/api'

export const api = {
  // 환경
  getEnvironment: (projectId: string) =>
    request<Environment>(`/api/projects/${projectId}/environment`),
  getWorkMethods: (projectId: string) =>
    request<WorkMethod[]>(`/api/projects/${projectId}/work-methods`),

  // 변화
  getChanges: (params?: { task_type?: string; impact?: string; nature?: string }) => {
    const qs = new URLSearchParams(
      Object.entries(params ?? {}).filter(([, v]) => v) as [string, string][],
    ).toString()
    return request<MatchedChange[]>(`/api/changes${qs ? `?${qs}` : ''}`)
  },
  getChange: (changeId: string) => request<ChangeDetail>(`/api/changes/${changeId}`),

  // 비교
  startComparison: (body: StartComparisonBody) =>
    request<Comparison>('/api/comparisons', { method: 'POST', body }),
  getComparison: (id: string) => request<Comparison>(`/api/comparisons/${id}`),
  cancelComparison: (id: string) =>
    request<Comparison>(`/api/comparisons/${id}/cancel`, { method: 'POST' }),
  rerunComparison: (id: string) =>
    request<Comparison>(`/api/comparisons/${id}/rerun`, { method: 'POST' }),

  // 검증
  updateFinding: (id: string, body: { verification: FindingVerification; user_note?: string }) =>
    request<Finding>(`/api/findings/${id}`, { method: 'PATCH', body }),

  // 결정
  decide: (matchId: string, body: DecisionBody) =>
    request<void>(`/api/matches/${matchId}/decision`, { method: 'POST', body }),

  // 교체와 복원
  startSwitch: (body: SwitchBody) => request<Switch>('/api/switches', { method: 'POST', body }),
  rollback: (switchId: string, body: RollbackBody) =>
    request<Switch>(`/api/switches/${switchId}/rollback`, { method: 'POST', body }),

  // 이력
  getHistory: () => request<DecisionLog[]>('/api/history'),
}
