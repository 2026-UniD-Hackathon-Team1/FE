// ⚠️ 개발용 더미 데이터. 화면 개발 확인용일 뿐이며 시연에 쓰면 안 된다.
// 명세 2.3 / 12.2: 시연 수치는 실제 비교 실행 결과로만 채운다.
import type {
  Candidate,
  Change,
  Comparison,
  ComparisonResult,
  DecisionLog,
  Environment,
  Match,
  WorkMethod,
} from '../types/domain'

const now = () => new Date().toISOString()

export const environment: Environment = {
  id: 'env_001',
  project_id: 'prj_001',
  tool: { name: '[TBD: D-01]', version: null, source: null, last_checked_at: now(), excluded: false },
  model: { name: 'dummy-model', version: null, source: null, last_checked_at: now(), excluded: false },
  skills: [
    { name: 'dummy-review-prompt', version: '1.0.0', source: 'local', last_checked_at: now(), excluded: false },
  ],
  config_files: [{ path: '.tool/config.json', summary: '더미 설정 파일' }],
  last_checked_at: now(),
}

export const workMethods: WorkMethod[] = [
  {
    id: 'wm_001',
    project_id: 'prj_001',
    task_type: 'code_review',
    prompt: '(더미) 긴 리뷰 프롬프트',
    skill: null,
    output_format: '항목별 코멘트',
    test_command: 'npm test',
    required_conditions: ['확인된 결함을 놓치지 않기'],
    secondary_metrics: ['실행 시간'],
    version: 1,
  },
]

export const changes: Change[] = [
  {
    id: 'chg_001',
    title: '(더미) 코드 리뷰용 스킬 공개',
    change_type: 'new_skill',
    target_tool: '[TBD: D-01]',
    target_versions: '>= x.y',
    task_types: ['code_review'],
    replaces: ['리뷰 프롬프트 직접 붙여넣기'],
    summary: 'PR 변경분을 입력하면 리뷰 코멘트를 생성하는 스킬',
    claimed_benefit: '제공자가 주장하는 개선 효과 (확인 전)',
    sources: [{ url: 'https://example.invalid/skill-a', kind: 'registry' }],
    published_at: '2026-11-01',
    verified_at: '2026-11-10',
    impact_hint: 'high',
  },
  {
    id: 'chg_002',
    title: '(더미) 테스트 작성 스킬 업데이트',
    change_type: 'skill_update',
    target_tool: '[TBD: D-01]',
    target_versions: '>= x.y',
    task_types: ['test_writing'],
    replaces: ['테스트 직접 작성 요청'],
    summary: '대상 코드를 주면 테스트를 생성하는 스킬',
    claimed_benefit: null,
    sources: [{ url: 'https://example.invalid/skill-b', kind: 'official_changelog' }],
    published_at: '2026-11-05',
    verified_at: '2026-11-10',
    impact_hint: 'medium',
  },
]

export const matches: Match[] = [
  {
    id: 'mt_001',
    change_id: 'chg_001',
    environment_id: 'env_001',
    impact: 'high',
    nature: 'improvement',
    reason: '등록한 코드 리뷰 프롬프트를 대체할 수 있어요',
    status: 'new',
    snoozed_until: null,
  },
  {
    id: 'mt_002',
    change_id: 'chg_002',
    environment_id: 'env_001',
    impact: 'medium',
    nature: 'improvement',
    reason: '등록한 테스트 작성 작업과 관련 있어요',
    status: 'compared',
    snoozed_until: null,
  },
]

export const candidates: Candidate[] = [
  {
    id: 'cand_001',
    change_id: 'chg_001',
    pinned_version: '0.1.0',
    support_level: 'switchable',
    status: 'active',
    provenance: 'community',
    repository_url: 'https://example.invalid/skill-a',
    author: 'dummy-author',
    license: 'MIT',
    last_maintained_at: '2026-11-01',
    permissions: [
      { kind: 'file_read', description: '프로젝트 파일 읽기', is_additional: false },
      { kind: 'command_exec', description: 'git diff 실행', is_additional: true },
    ],
    compatibility: 'runnable',
    required_setup: [],
    risk_signals: [],
  },
  {
    id: 'cand_002',
    change_id: 'chg_002',
    pinned_version: '2.0.0',
    support_level: 'comparable',
    status: 'active',
    provenance: 'official',
    repository_url: 'https://example.invalid/skill-b',
    author: 'dummy-author',
    license: 'Apache-2.0',
    last_maintained_at: '2026-11-05',
    permissions: [
      { kind: 'file_read', description: '대상 코드 읽기', is_additional: false },
      { kind: 'file_write', description: '테스트 파일 생성', is_additional: false },
    ],
    compatibility: 'runnable',
    required_setup: [],
    risk_signals: [],
  },
]

const inputs = [1, 2, 3].map((n) => ({
  id: `in_${n}`,
  label: `작업 ${n}`,
  ref: `dummy/path-${n}.ts`,
  content_hash: `hash${n}`,
  is_example: true,
}))

function dummyResult(comparisonId: string, inputId: string, method: 'baseline' | 'candidate'): ComparisonResult {
  const id = `${comparisonId}_${inputId}_${method}`
  return {
    id,
    comparison_id: comparisonId,
    input_id: inputId,
    method,
    raw_output: `(더미) ${method === 'baseline' ? '기존 방식' : '후보 방식'} 출력 원문`,
    metrics: [
      { key: 'raised', label: '제기한 문제', value: null, unit: '건', basis: '이 작업', evidence: 'measured' },
      { key: 'confirmed', label: '확인된 문제', value: null, unit: '건', basis: '이 작업', evidence: 'user_verified' },
      { key: 'duration', label: '실행 시간', value: null, unit: '초', basis: '이 작업', evidence: 'measured' },
    ],
    duration_ms: null,
    usage: { tokens: null, cost: null, cost_kind: null },
    run_status: 'success',
    failure_reason: null,
    findings: [
      {
        id: `${id}_f1`,
        comparison_result_id: id,
        location: `dummy/path.ts:10`,
        content: '(더미) 지적 내용',
        group_id: 'grp_1',
        severity: null,
        verification: 'needs_check',
        user_note: null,
        history: [],
      },
    ],
  }
}

function dummyComparison(
  id: string,
  matchId: string,
  candidateId: string,
  verdict: Comparison['verdict'],
  reason: string,
): Comparison {
  return {
    id,
    match_id: matchId,
    candidate_id: candidateId,
    inputs,
    conditions: {
      model_id: 'dummy-model',
      baseline_label: '기존 프롬프트',
      candidate_label: '후보 스킬',
      time_limit_sec: 120,
      estimated_cost: null,
    },
    status: 'done',
    verdict,
    verdict_reason: reason,
    verdict_rule_version: 'v0',
    run_count: 1,
    executed_at: now(),
    is_prerecorded: true,
    results: inputs.flatMap((i) => [
      dummyResult(id, i.id, 'baseline'),
      dummyResult(id, i.id, 'candidate'),
    ]),
  }
}

/** 시나리오 A(새 방식 유리), B(기존 방식 유리) 화면 확인용 */
export const comparisons: Record<string, Comparison> = {
  cmp_a: dummyComparison('cmp_a', 'mt_001', 'cand_001', 'candidate_better', '(더미) 판정 이유'),
  cmp_b: dummyComparison(
    'cmp_b',
    'mt_002',
    'cand_002',
    'baseline_better',
    '(더미) 등록한 필수 조건을 지키지 못했어요',
  ),
}

export const history: DecisionLog[] = []
