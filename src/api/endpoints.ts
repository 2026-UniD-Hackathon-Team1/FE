// 명세 8장 API 목록 + 화면 작업에서 추가한 엔드포인트 (PRODUCT.md "임시 결정")
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
  AgentCode,
  AgentInfo,
  ChangeDetail,
  ComparisonPrep,
  DecisionBody,
  EnvItemInput,
  EnvRecheck,
  MatchedChange,
  Me,
  ProjectDetail,
  RollbackBody,
  StartComparisonBody,
  SwitchBody,
  SwitchPreview,
} from '../types/api'

export const api = {
  // 계정 (D-04)
  getMe: () => request<Me>('/api/me'),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),

  // 프로젝트와 연결 프로그램 (D-03)
  getProject: (projectId: string) => request<ProjectDetail>(`/api/projects/${projectId}`),
  disconnectProject: (projectId: string) => request<void>(`/api/projects/${projectId}`, { method: 'DELETE' }),
  deleteData: (projectId: string, kind: 'comparisons' | 'backups') =>
    request<void>(`/api/projects/${projectId}/data?kind=${kind}`, { method: 'DELETE' }),
  getAgent: (projectId: string) => request<AgentInfo>(`/api/projects/${projectId}/agent`),
  createAgentCode: (projectId: string) => request<AgentCode>(`/api/projects/${projectId}/agent/code`, { method: 'POST' }),

  // 환경
  getEnvironment: (projectId: string) => request<Environment>(`/api/projects/${projectId}/environment`),
  recheckEnvironment: (projectId: string) =>
    request<EnvRecheck>(`/api/projects/${projectId}/environment/recheck`, { method: 'POST' }),
  addEnvItem: (projectId: string, body: EnvItemInput) =>
    request<Environment>(`/api/projects/${projectId}/environment/items`, { method: 'POST', body }),
  getWorkMethods: (projectId: string) => request<WorkMethod[]>(`/api/projects/${projectId}/work-methods`),

  // 변화
  getChanges: () => request<MatchedChange[]>('/api/changes'),
  getHiddenChanges: () => request<MatchedChange[]>('/api/changes/hidden'),
  getChange: (changeId: string) => request<ChangeDetail>(`/api/changes/${changeId}`),
  unhide: (matchId: string) => request<void>(`/api/matches/${matchId}/unhide`, { method: 'POST' }),

  // 비교
  prepareComparison: (candidateId: string, matchId: string) =>
    request<ComparisonPrep>(`/api/comparisons/prepare?candidate=${candidateId}&match=${matchId}`),
  startComparison: (body: StartComparisonBody) => request<Comparison>('/api/comparisons', { method: 'POST', body }),
  getComparison: (id: string) => request<Comparison>(`/api/comparisons/${id}`),
  cancelComparison: (id: string) => request<Comparison>(`/api/comparisons/${id}/cancel`, { method: 'POST' }),
  rerunComparison: (id: string) => request<Comparison>(`/api/comparisons/${id}/rerun`, { method: 'POST' }),

  // 검증
  updateFinding: (id: string, body: { verification: FindingVerification; user_note?: string }) =>
    request<Finding>(`/api/findings/${id}`, { method: 'PATCH', body }),

  // 결정
  decide: (matchId: string, body: DecisionBody) => request<void>(`/api/matches/${matchId}/decision`, { method: 'POST', body }),

  // 교체와 복원
  getSwitchPreview: (comparisonId: string) => request<SwitchPreview>(`/api/comparisons/${comparisonId}/switch-preview`),
  startSwitch: (body: SwitchBody) => request<Switch>('/api/switches', { method: 'POST', body }),
  rollback: (switchId: string, body: RollbackBody) =>
    request<Switch>(`/api/switches/${switchId}/rollback`, { method: 'POST', body }),

  // 이력
  getHistory: () => request<DecisionLog[]>('/api/history'),
}
