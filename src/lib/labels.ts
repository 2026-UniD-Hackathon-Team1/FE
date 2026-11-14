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
  ChangeType,
  MatchStatus,
} from '../types/domain'
import type { RollbackReason } from '../types/api'

export const taskTypeLabel: Record<TaskType, string> = {
  code_review: '코드 리뷰',
  test_writing: '테스트 작성',
}

export const natureLabel: Record<ChangeNature, string> = {
  action_required: '대응 필요',
  improvement: '개선 후보',
}

export const impactLabel: Record<Impact, string> = {
  high: '영향도 높음',
  medium: '영향도 보통',
  low: '영향도 낮음',
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

export const changeTypeLabel: Record<ChangeType, string> = {
  new_skill: '신규 스킬',
  skill_update: '스킬 업데이트',
  feature_change: '기능 변경',
  usage_changed: '사용법 변경',
  step_obsolete: '단계 불필요',
  deprecated: '지원 종료',
}

export const matchStatusLabel: Record<MatchStatus, string> = {
  new: '비교 전',
  seen: '비교 전',
  snoozed: '나중에',
  dismissed: '숨김',
  compared: '비교 완료',
  kept: '기존 방식 유지',
  switched: '바꿈',
  rolled_back: '되돌림',
}

export const rollbackReasonLabel: Record<RollbackReason, string> = {
  worse_result: '결과가 나빠짐',
  inconvenient: '쓰기 불편함',
  other: '기타',
}

/** 지표 이름 아래 붙는 설명 (5.4장 정의) */
export const metricHelp: Record<string, string> = {
  raised: '지적한 항목 수. 정확성을 뜻하지 않아요',
  confirmed: '재현 테스트나 직접 검토로 확인',
  false_positive: '잘못된 지적으로 확인',
  missed: '다른 방식이 찾고 검증된 문제 기준',
  runnable: '생성한 테스트가 정상 실행되는지',
  normal: '정상 코드에서 요구사항대로 검증',
  defects: '알려진 결함을 넣은 코드에서 잡아내는지',
  rules: '등록한 규칙 기준',
  duration: '같은 범위에서 측정',
  cost: '사용량 기반 추정',
}

const pad = (n: number) => String(n).padStart(2, '0')

/** "오늘 14:02" / "11.14 14:20" */
export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return '확인 불가'
  const d = new Date(iso)
  const now = new Date()
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  if (d.toDateString() === now.toDateString()) return `오늘 ${time}`
  return `${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${time}`
}

/** "2026.11.08" */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '확인 불가'
  const d = new Date(iso)
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`
}

const WEEK = ['일', '월', '화', '수', '목', '금', '토']
/** "2026.11.14 (토)" */
export function formatDay(iso: string): string {
  const d = new Date(iso)
  return `${formatDate(iso)} (${WEEK[d.getDay()]})`
}

/** 연결 프로그램이 읽고 쓸 수 있는 범위 (FR-01) */
export const accessScopeLabel: Record<string, string> = {
  config: 'Codex 설정 파일 (.codex/)',
  skills: '설치된 스킬 목록',
  code: '프로젝트 코드 (비교할 때 고른 파일만)',
  write: '스킬·설정 쓰기 (바꾸기와 되돌리기에 필요)',
}
export const accessScopeShort: Record<string, string> = {
  config: '설정 읽기',
  skills: '스킬 목록 읽기',
  code: '코드 읽기',
  write: '스킬·설정 쓰기',
}

/** 프로필 선택지 (설계서 F01). 키는 백엔드에 그대로 보낸다 */
export const roleOptions = ['백엔드 개발', '프론트엔드 개발', '풀스택 개발', '데이터·ML']
export const languageLabel: Record<string, string> = {
  python: 'Python',
  typescript: 'TypeScript',
  java: 'Java',
  go: 'Go',
}
export const goalLabel: Record<string, string> = {
  input_validation: '입력값 검증 놓치지 않기',
  exception_handling: '예외 처리 꼼꼼히',
  regression_test: '회귀 테스트 챙기기',
  test_coverage: '테스트 범위 넓히기',
  documentation: '문서·주석 정리',
}
