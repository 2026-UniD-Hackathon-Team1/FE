// 화면에 쓰는 한국어 라벨 모음 (6.5: UI는 한국어, 도구·스킬 이름은 원어)
import type {
  ChangeNature,
  ComparisonStatus,
  Compatibility,
  DecisionAction,
  EvidenceKind,
  FindingVerification,
  Impact,
  PermissionKind,
  Provenance,
  TaskType,
  Verdict,
} from '../types/domain'

export const taskTypeLabel: Record<TaskType, string> = {
  code_review: '코드 리뷰',
  test_writing: '테스트 작성',
}

export const natureLabel: Record<ChangeNature, string> = {
  action_required: '대응 필요',
  improvement: '개선 후보',
}

export const impactLabel: Record<Impact, string> = {
  high: '영향 큼',
  medium: '영향 보통',
  low: '참고',
}

export const comparisonStatusLabel: Record<ComparisonStatus, string> = {
  queued: '대기',
  running_baseline: '기존 방식 실행 중',
  running_candidate: '후보 방식 실행 중',
  evaluating: '평가 중',
  done: '완료',
  failed: '실패',
  timeout: '시간 초과',
  cancelled: '중단',
}

export const verdictLabel: Record<Verdict, string> = {
  candidate_better: '이번 비교에서는 새 방식이 유리',
  depends_on_criteria: '선택 기준에 따라 다름',
  baseline_better: '이번 비교에서는 기존 방식이 유리',
  no_difference: '확인된 차이 없음',
  inconclusive: '판단 보류',
}

export const evidenceLabel: Record<EvidenceKind, string> = {
  measured: '측정값',
  user_verified: '사용자 확인',
  ai_note: 'AI 해설',
}

export const verificationLabel: Record<FindingVerification, string> = {
  reproduced: '재현 확인',
  user_confirmed: '사용자 확인',
  false_positive: '오탐 확인',
  needs_check: '확인 필요',
}

export const provenanceLabel: Record<Provenance, string> = {
  official: '공식',
  community: '커뮤니티',
  unverified: '미확인',
}

export const compatibilityLabel: Record<Compatibility, string> = {
  runnable: '실행 가능',
  needs_setup: '추가 설정 필요',
  unsupported: '지원하지 않음',
  unknown: '확인되지 않음',
}

export const permissionLabel: Record<PermissionKind, string> = {
  file_read: '파일 읽기',
  file_write: '파일 쓰기',
  network: '네트워크',
  command_exec: '명령 실행',
}

export const actionLabel: Record<DecisionAction, string> = {
  switch: '바꿔보기',
  keep: '기존 방식 유지',
  more_comparison: '추가 비교',
  later: '나중에',
  not_interested: '관심 없음',
  compared: '비교 실행',
  rolled_back: '되돌리기',
}
