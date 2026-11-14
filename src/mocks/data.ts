// ⚠️ 개발용 더미 데이터. 화면 개발 확인용일 뿐이며 시연에 쓰면 안 된다.
// 명세 2.3 / 12.2: 시연 수치는 실제 비교 실행 결과로만 채운다.
// 이름(pr-review, test-writer 등)과 숫자는 Figma 시안과 맞춘 예시다.
import type {
  Candidate,
  Change,
  Comparison,
  ComparisonInput,
  ComparisonResult,
  DecisionLog,
  Environment,
  Finding,
  FindingVerification,
  Match,
  Method,
  MetricValue,
  WorkMethod,
} from '../types/domain'

/** 오늘 기준 상대 시각 */
export const at = (dayOffset: number, h: number, m: number) => {
  const d = new Date()
  d.setDate(d.getDate() + dayOffset)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

export const environment: Environment = {
  id: 'env_001',
  project_id: 'prj_001',
  tool: {
    name: 'AI 코딩 도구',
    version: '1.4.2',
    source: '공식 배포',
    last_checked_at: at(0, 14, 2),
    excluded: false,
  },
  model: {
    name: '기본 모델',
    version: null,
    source: '도구 설정',
    last_checked_at: at(0, 14, 2),
    excluded: false,
  },
  skills: [
    {
      name: 'lint-fix',
      version: '1.8.0',
      source: '공식 저장소',
      last_checked_at: at(0, 14, 2),
      excluded: false,
    },
    {
      name: 'commit-helper',
      version: '0.4.1',
      source: '커뮤니티',
      last_checked_at: at(0, 14, 2),
      excluded: true,
    },
  ],
  config_files: [{ path: '리뷰 프롬프트.md', summary: '프로젝트 파일' }],
  unreadable_files: ['.codex/config.local.toml'],
  last_checked_at: at(0, 14, 2),
}

export const workMethods: WorkMethod[] = [
  {
    id: 'wm_review',
    project_id: 'prj_001',
    task_type: 'code_review',
    prompt: '이 PR의 변경분을 리뷰해 줘. 버그, 보안 문제, 누락된 예외 처리를 찾고 파일과 줄 번호를 같이 알려 줘. 스타일 지적은 빼 줘.',
    skill: null,
    output_format: '파일·줄 번호·문제·이유',
    test_command: null,
    required_conditions: ['확인된 결함을 놓치지 않기', '프로젝트 규칙 지키기'],
    secondary_metrics: ['실행 시간', '비용'],
    version: 2,
  },
  {
    id: 'wm_test',
    project_id: 'prj_001',
    task_type: 'test_writing',
    prompt: '이 파일의 테스트를 작성해 줘. 경계값과 실패 경로를 포함해 줘.',
    skill: null,
    output_format: null,
    test_command: 'pytest -q',
    required_conditions: ['확인된 결함을 놓치지 않기', '프로젝트 규칙 지키기'],
    secondary_metrics: ['실행 시간', '비용'],
    version: 1,
  },
]

const src = (url: string, kind: Change['sources'][number]['kind']) => [{ url, kind }]

export const changes: Change[] = [
  {
    id: 'chg_lint',
    title: 'lint-fix 1.x 지원 종료 예정',
    change_type: 'deprecated',
    target_tool: 'AI 코딩 도구',
    target_versions: '>= 1.5.0',
    task_types: ['code_review'],
    replaces: ['lint-fix 1.8.0'],
    summary: '도구 1.5부터 lint-fix 1.x가 동작하지 않아요. 2.0으로 옮겨야 해요.',
    claimed_benefit: null,
    sources: src('https://example.invalid/tool/changelog', 'official_changelog'),
    published_at: at(-4, 9, 0),
    verified_at: at(-3, 10, 0),
    impact_hint: 'high',
  },
  {
    id: 'chg_pr',
    title: '코드 리뷰 스킬 pr-review 2.1.0 공개',
    change_type: 'new_skill',
    target_tool: 'AI 코딩 도구',
    target_versions: '>= 1.4.0',
    task_types: ['code_review'],
    replaces: ['리뷰 프롬프트 직접 붙여넣기'],
    summary: 'PR 변경분을 입력하면 파일과 줄 번호가 붙은 리뷰 코멘트를 만들어 주는 스킬이에요. 리뷰 프롬프트를 매번 붙여 넣지 않아도 돼요.',
    claimed_benefit: '리뷰 시간을 줄이고, 놓치기 쉬운 예외 처리를 더 잘 찾아냅니다.',
    sources: src('https://example.invalid/skills/pr-review', 'registry'),
    published_at: at(-6, 9, 0),
    verified_at: at(-5, 10, 0),
    impact_hint: 'high',
  },
  {
    id: 'chg_tw',
    title: '테스트 작성 스킬 test-writer 0.9.0 공개',
    change_type: 'new_skill',
    target_tool: 'AI 코딩 도구',
    target_versions: '>= 1.3.0',
    task_types: ['test_writing'],
    replaces: ['테스트 프롬프트 직접 입력'],
    summary: '대상 코드를 주면 테스트 파일을 만들어 주는 스킬이에요.',
    claimed_benefit: '테스트 작성 시간을 절반으로 줄입니다.',
    sources: src('https://example.invalid/skills/test-writer', 'registry'),
    published_at: at(-11, 9, 0),
    verified_at: at(-10, 10, 0),
    impact_hint: 'medium',
  },
  {
    id: 'chg_sum',
    title: '도구 1.4.2: 변경분 요약 기능 추가',
    change_type: 'feature_change',
    target_tool: 'AI 코딩 도구',
    target_versions: '>= 1.4.2',
    task_types: ['code_review'],
    replaces: ['변경 요약 직접 작성'],
    summary: '리뷰 전에 변경분 요약을 자동으로 만들어요.',
    claimed_benefit: null,
    sources: src('https://example.invalid/tool/changelog#1.4.2', 'official_changelog'),
    published_at: at(-2, 9, 0),
    verified_at: at(-1, 10, 0),
    impact_hint: 'medium',
  },
  {
    id: 'chg_ch',
    title: 'commit-helper 0.5.0 업데이트',
    change_type: 'skill_update',
    target_tool: 'AI 코딩 도구',
    target_versions: '>= 1.2.0',
    task_types: ['code_review'],
    replaces: [],
    summary: '커밋 메시지 형식 옵션이 늘었어요.',
    claimed_benefit: null,
    sources: src('https://example.invalid/skills/commit-helper', 'registry'),
    published_at: at(-3, 9, 0),
    verified_at: at(-2, 10, 0),
    impact_hint: 'low',
  },
  {
    id: 'chg_attach',
    title: '테스트 실행 결과 자동 첨부 설정 추가',
    change_type: 'usage_changed',
    target_tool: 'AI 코딩 도구',
    target_versions: '>= 1.4.0',
    task_types: ['test_writing'],
    replaces: ['테스트 결과 붙여넣기'],
    summary: '테스트 작성 뒤 실행 결과를 자동으로 첨부해요.',
    claimed_benefit: null,
    sources: src('https://example.invalid/tool/changelog#attach', 'official_changelog'),
    published_at: at(-5, 9, 0),
    verified_at: at(-4, 10, 0),
    impact_hint: 'medium',
  },
  {
    id: 'chg_fmt',
    title: '리뷰 결과 형식 옵션 추가',
    change_type: 'feature_change',
    target_tool: 'AI 코딩 도구',
    target_versions: '>= 1.4.0',
    task_types: ['code_review'],
    replaces: [],
    summary: '리뷰 결과를 원하는 형식으로 고를 수 있어요.',
    claimed_benefit: null,
    sources: src('https://example.invalid/tool/changelog#format', 'official_changelog'),
    published_at: at(-9, 9, 0),
    verified_at: at(-8, 10, 0),
    impact_hint: 'low',
  },
  {
    id: 'chg_doc',
    title: '문서화 스킬 doc-gen 1.0.0 공개',
    change_type: 'new_skill',
    target_tool: 'AI 코딩 도구',
    target_versions: '>= 1.3.0',
    task_types: ['code_review'],
    replaces: [],
    summary: '주석과 README를 만들어 주는 스킬이에요.',
    claimed_benefit: null,
    sources: src('https://example.invalid/skills/doc-gen', 'registry'),
    published_at: at(-8, 9, 0),
    verified_at: at(-7, 10, 0),
    impact_hint: 'low',
  },
  {
    id: 'chg_ch041',
    title: '커밋 메시지 스킬 commit-helper 0.4.1',
    change_type: 'skill_update',
    target_tool: 'AI 코딩 도구',
    target_versions: '>= 1.2.0',
    task_types: ['code_review'],
    replaces: [],
    summary: '커밋 메시지를 만들어 주는 스킬이에요.',
    claimed_benefit: null,
    sources: src('https://example.invalid/skills/commit-helper/0.4.1', 'registry'),
    published_at: at(-12, 9, 0),
    verified_at: at(-11, 10, 0),
    impact_hint: 'low',
  },
]

const m = (
  id: string,
  change_id: string,
  impact: Match['impact'],
  nature: Match['nature'],
  reason: string,
  status: Match['status'],
  snoozed_until: string | null = null,
): Match => ({
  id,
  change_id,
  environment_id: 'env_001',
  impact,
  nature,
  reason,
  status,
  snoozed_until,
})

export const matches: Match[] = [
  m('mt_lint', 'chg_lint', 'high', 'action_required', '설치된 lint-fix 1.8.0이 도구 1.5부터 동작하지 않을 수 있어요.', 'new'),
  m('mt_pr', 'chg_pr', 'high', 'improvement', '지금 코드 리뷰에 쓰는 프롬프트를 대체할 수 있어요.', 'new'),
  m('mt_tw', 'chg_tw', 'medium', 'improvement', '등록한 테스트 작성 작업을 더 적은 단계로 할 수 있어요.', 'compared'),
  m('mt_sum', 'chg_sum', 'medium', 'improvement', '리뷰 전에 손으로 쓰던 변경 요약 단계를 줄일 수 있어요.', 'new'),
  m('mt_ch', 'chg_ch', 'low', 'improvement', '비교에서 제외한 스킬이에요. 참고용으로만 보여 드려요.', 'seen'),
  m('mt_attach', 'chg_attach', 'medium', 'improvement', '테스트 작성 뒤 결과를 붙여 넣던 단계가 필요 없어질 수 있어요.', 'snoozed', at(5, 9, 0)),
  m('mt_fmt', 'chg_fmt', 'low', 'improvement', '등록한 결과 형식과 같은 형식을 고를 수 있어요.', 'kept'),
  m('mt_doc', 'chg_doc', 'low', 'improvement', '문서 작성 작업과 관련 있어요.', 'dismissed'),
  m('mt_ch041', 'chg_ch041', 'low', 'improvement', '커밋 메시지 작업과 관련 있어요.', 'dismissed'),
]

const perm = (kind: Candidate['permissions'][number]['kind'], description: string, is_additional = false) => ({ kind, description, is_additional })

export const candidates: Candidate[] = [
  {
    id: 'cand_pr',
    change_id: 'chg_pr',
    pinned_version: '2.1.0',
    support_level: 'switchable',
    status: 'active',
    provenance: 'official',
    repository_url: 'https://github.com/example/pr-review',
    author: '도구 제공사',
    license: 'MIT',
    last_maintained_at: at(-6, 9, 0),
    permissions: [
      perm('file_read', '프로젝트 안의 변경된 파일과 관련 파일을 읽어요'),
      perm('command_exec', 'git diff 명령으로 변경분을 가져와요', true),
      perm('network', '모델 API로 변경분을 보내요'),
    ],
    compatibility: 'runnable',
    required_setup: [],
    risk_signals: [],
  },
  {
    id: 'cand_tw',
    change_id: 'chg_tw',
    pinned_version: '0.9.0',
    support_level: 'comparable',
    status: 'active',
    provenance: 'official',
    repository_url: 'https://github.com/example/test-writer',
    author: '도구 제공사',
    license: 'MIT',
    last_maintained_at: at(-11, 9, 0),
    permissions: [perm('file_read', '대상 코드를 읽어요'), perm('file_write', '테스트 파일을 만들어요'), perm('command_exec', 'pytest -q로 테스트를 실행해요', true)],
    compatibility: 'runnable',
    required_setup: [],
    risk_signals: [],
  },
  {
    id: 'cand_lint',
    change_id: 'chg_lint',
    pinned_version: '2.0.0',
    support_level: 'switchable',
    status: 'active',
    provenance: 'official',
    repository_url: 'https://github.com/example/lint-fix',
    author: '도구 제공사',
    license: 'MIT',
    last_maintained_at: at(-4, 9, 0),
    permissions: [perm('file_read', '변경된 파일을 읽어요')],
    compatibility: 'runnable',
    required_setup: [],
    risk_signals: [],
  },
  {
    id: 'cand_ch',
    change_id: 'chg_ch',
    pinned_version: '0.5.0',
    support_level: 'info_only',
    status: 'active',
    provenance: 'community',
    repository_url: 'https://github.com/example/commit-helper',
    author: 'commit-helper 기여자',
    license: null,
    last_maintained_at: at(-3, 9, 0),
    permissions: [perm('file_read', '스테이징된 변경분을 읽어요')],
    compatibility: 'unknown',
    required_setup: [],
    risk_signals: ['최근 등록되었고 사용 기록이 적음'],
  },
  {
    id: 'cand_sum',
    change_id: 'chg_sum',
    pinned_version: '1.4.2',
    support_level: 'comparable',
    status: 'active',
    provenance: 'official',
    repository_url: 'https://example.invalid/tool',
    author: '도구 제공사',
    license: null,
    last_maintained_at: at(-2, 9, 0),
    permissions: [perm('file_read', '변경된 파일을 읽어요')],
    compatibility: 'runnable',
    required_setup: [],
    risk_signals: [],
  },
]

// ── 비교 ────────────────────────────────────────────────

const prInputs: ComparisonInput[] = [
  {
    id: 'in_128',
    label: '#128 주문 취소 API',
    ref: 'PR #128',
    content_hash: 'a41c9e2',
    is_example: false,
  },
  {
    id: 'in_124',
    label: '#124 쿠폰 중복 적용',
    ref: 'PR #124',
    content_hash: '9d2f7a0',
    is_example: false,
  },
  {
    id: 'in_119',
    label: '#119 결제 재시도',
    ref: 'PR #119',
    content_hash: '31e8c4f',
    is_example: false,
  },
]
const testInputs: ComparisonInput[] = [
  {
    id: 'in_cancel',
    label: 'cancel.py',
    ref: 'src/orders/cancel.py',
    content_hash: 'b71a',
    is_example: false,
  },
  {
    id: 'in_apply',
    label: 'apply.py',
    ref: 'src/coupons/apply.py',
    content_hash: 'c02e',
    is_example: false,
  },
  {
    id: 'in_retry',
    label: 'retry.py',
    ref: 'src/payments/retry.py',
    content_hash: 'd9f4',
    is_example: false,
  },
]

interface MetricDef {
  key: string
  label: string
  unit: string
  evidence: MetricValue['evidence']
  /** 작업별 [기존, 후보]. null = 측정 실패 */
  values: [number | null, number | null][]
  totals?: number[]
}

interface FindingDef {
  content: string
  location: string
  input: number
  methods: Method[]
  verification: FindingVerification
  severity?: string | null
}

interface Spec {
  id: string
  match_id: string
  candidate_id: string
  baseline_label: string
  candidate_label: string
  inputs: ComparisonInput[]
  metrics: MetricDef[]
  findings: FindingDef[]
  raw: [string, string][]
  verdict: Comparison['verdict']
  reason: string
  ai_note: Comparison['ai_note']
  executed_at: string
  status?: Comparison['status']
  /** 실패한 실행: [작업 index, 방식, 이유] */
  failures?: [number, Method, 'failed' | 'timeout', string][]
}

function build(s: Spec): Comparison {
  const results: ComparisonResult[] = s.inputs.flatMap((input, i) =>
    (['baseline', 'candidate'] as Method[]).map((method, mi) => {
      const id = `${s.id}_${input.id}_${method}`
      const fail = s.failures?.find(([fi, fm]) => fi === i && fm === method)
      const metrics: MetricValue[] = s.metrics.map((d) => ({
        key: d.key,
        label: d.label,
        value: fail ? null : d.values[i][mi],
        unit: d.unit,
        basis: input.label,
        total: d.totals ? d.totals[i] : null,
        evidence: d.evidence,
      }))
      const findings: Finding[] = fail
        ? []
        : s.findings
            .filter((f) => f.input === i && f.methods.includes(method))
            .map((f) => ({
              id: `${s.id}_f${s.findings.indexOf(f)}_${method}`,
              comparison_result_id: id,
              location: f.location,
              content: f.content,
              group_id: `${s.id}_g${s.findings.indexOf(f)}`,
              severity: f.severity ?? null,
              verification: f.verification,
              user_note: null,
              history: [],
            }))
      const durationMetric = s.metrics.find((d) => d.key === 'duration')
      return {
        id,
        comparison_id: s.id,
        input_id: input.id,
        method,
        raw_output: fail ? '' : s.raw[i][mi],
        metrics,
        duration_ms: fail || !durationMetric ? null : (durationMetric.values[i][mi] ?? 0) * 1000,
        usage: { tokens: null, cost: null, cost_kind: 'estimated' as const },
        run_status: fail ? fail[2] : ('success' as const),
        failure_reason: fail ? fail[3] : null,
        findings,
      }
    }),
  )
  return {
    id: s.id,
    match_id: s.match_id,
    candidate_id: s.candidate_id,
    inputs: s.inputs,
    conditions: {
      model_id: '기본 모델',
      baseline_label: s.baseline_label,
      candidate_label: s.candidate_label,
      time_limit_sec: 180,
      estimated_cost: '약 0.40달러',
    },
    status: s.status ?? 'done',
    verdict: s.verdict,
    verdict_reason: s.reason,
    verdict_rule_version: 'v1',
    run_count: 1,
    executed_at: s.executed_at,
    is_prerecorded: true,
    results,
    ai_note: s.ai_note,
  }
}

const reviewMetrics = (
  cost: [number, number][] = [
    [0.07, 0.06],
    [0.07, 0.06],
    [0.07, 0.06],
  ],
): MetricDef[] => [
  {
    key: 'raised',
    label: '제기한 문제',
    unit: '건',
    evidence: 'measured',
    values: [
      [3, 4],
      [3, 4],
      [3, 3],
    ],
  },
  {
    key: 'confirmed',
    label: '확인된 문제',
    unit: '건',
    evidence: 'user_verified',
    values: [
      [2, 2],
      [1, 2],
      [1, 2],
    ],
  },
  {
    key: 'false_positive',
    label: '확인된 오탐',
    unit: '건',
    evidence: 'user_verified',
    values: [
      [1, 0],
      [1, 1],
      [0, 0],
    ],
  },
  {
    key: 'missed',
    label: '놓친 문제',
    unit: '건',
    evidence: 'measured',
    values: [
      [1, 0],
      [1, 0],
      [0, 0],
    ],
  },
  {
    key: 'duration',
    label: '실행 시간',
    unit: '초',
    evidence: 'measured',
    values: [
      [30, 22],
      [31, 24],
      [33, 25],
    ],
  },
  {
    key: 'cost',
    label: '비용',
    unit: '달러',
    evidence: 'measured',
    values: cost,
  },
]

const reviewFindings: FindingDef[] = [
  {
    content: '배송된 주문도 취소됨',
    location: 'src/orders/cancel.py:42',
    input: 0,
    methods: ['baseline', 'candidate'],
    verification: 'reproduced',
  },
  {
    content: '동시 취소 시 환불 중복',
    location: 'src/orders/cancel.py:71',
    input: 0,
    methods: ['candidate'],
    verification: 'user_confirmed',
  },
  {
    content: '변수 이름이 모호함',
    location: 'src/coupons/apply.py:18',
    input: 1,
    methods: ['baseline'],
    verification: 'false_positive',
  },
  {
    content: '재시도 간격이 고정값',
    location: 'src/payments/retry.py:33',
    input: 2,
    methods: ['candidate'],
    verification: 'needs_check',
  },
]

const reviewRaw: [string, string][] = [
  [
    'cancel.py:42 · 이미 배송된 주문도 취소가 돼요. 상태 확인이 빠져 있어요.\ncancel.py:57 · 환불 실패 시 오류 메시지가 사용자에게 그대로 보여요.',
    'cancel.py:42 · 배송 완료 상태에서 취소를 막는 검사가 없어요.\ncancel.py:71 · 같은 주문에 취소 요청이 동시에 오면 환불이 두 번 될 수 있어요.\ncancel.py:57 · 환불 실패 시 재시도 없이 끝나요.',
  ],
  [
    'apply.py:18 · 변수 이름 c가 모호해요.\napply.py:40 · 쿠폰을 두 번 적용하는 경로가 있어요.',
    'apply.py:40 · 같은 쿠폰이 두 번 적용될 수 있어요.\napply.py:52 · 만료 시각을 분 단위로 비교해서 경계에서 틀릴 수 있어요.',
  ],
  ['retry.py:20 · 재시도 횟수 상한이 없어요.', 'retry.py:20 · 재시도 횟수 상한이 없어요.\nretry.py:33 · 재시도 간격이 고정값이라 장애 때 요청이 몰려요.'],
]

const prBase = {
  match_id: 'mt_pr',
  candidate_id: 'cand_pr',
  baseline_label: '리뷰 프롬프트 직접 붙여넣기',
  candidate_label: 'pr-review 2.1.0',
  inputs: prInputs,
  findings: reviewFindings,
  raw: reviewRaw,
  executed_at: at(0, 14, 20),
}

export const comparisons: Record<string, Comparison> = {
  /** 시나리오 A: 새 방식이 유리 */
  cmp_a: build({
    ...prBase,
    id: 'cmp_a',
    metrics: reviewMetrics(),
    verdict: 'candidate_better',
    reason: '필수 조건(확인된 결함 놓치지 않기)을 지켰고, 확인된 문제를 2건 더 찾았어요. 나빠진 것으로 확인된 주요 지표는 없어요.',
    ai_note: {
      summary: '후보 방식은 동시 실행과 관련된 문제를 2건 더 찾았고, 그중 1건은 직접 확인했어요. 스타일 지적이 줄어 오탐도 1건 적었어요.',
      next_check: '"재시도 간격이 고정값" 지적은 아직 확인되지 않았어요. 해당 입력으로 재현 테스트를 실행해 볼 수 있어요.',
    },
  }),
  /** 시나리오 B: 기존 방식이 유리 */
  cmp_b: build({
    id: 'cmp_b',
    match_id: 'mt_tw',
    candidate_id: 'cand_tw',
    baseline_label: '테스트 프롬프트 직접 입력',
    candidate_label: 'test-writer 0.9.0',
    inputs: testInputs,
    metrics: [
      {
        key: 'runnable',
        label: '실행 가능성',
        unit: '개',
        evidence: 'measured',
        values: [
          [1, 1],
          [1, 1],
          [1, 1],
        ],
        totals: [1, 1, 1],
      },
      {
        key: 'normal',
        label: '정상 동작 검증',
        unit: '개',
        evidence: 'measured',
        values: [
          [1, 1],
          [1, 1],
          [1, 1],
        ],
        totals: [1, 1, 1],
      },
      {
        key: 'defects',
        label: '결함 탐지',
        unit: '건',
        evidence: 'measured',
        values: [
          [1, 1],
          [1, 0],
          [1, 0],
        ],
        totals: [1, 1, 1],
      },
      {
        key: 'rules',
        label: '프로젝트 규칙 준수',
        unit: '개',
        evidence: 'user_verified',
        values: [
          [2, 1],
          [1, 0],
          [1, 1],
        ],
        totals: [2, 1, 1],
      },
      {
        key: 'duration',
        label: '실행 시간',
        unit: '초',
        evidence: 'measured',
        values: [
          [42, 24],
          [43, 25],
          [43, 25],
        ],
      },
      {
        key: 'cost',
        label: '비용',
        unit: '달러',
        evidence: 'measured',
        values: [
          [0.09, 0.07],
          [0.09, 0.06],
          [0.08, 0.06],
        ],
      },
    ],
    findings: [
      {
        content: '배송 전 취소 허용 조건',
        location: 'src/orders/cancel.py · 알려진 결함 1번',
        input: 0,
        methods: ['baseline', 'candidate'],
        verification: 'reproduced',
      },
      {
        content: '환불 실패 시 주문 상태 롤백 누락',
        location: 'src/orders/cancel.py · 알려진 결함 2번',
        input: 1,
        methods: ['baseline'],
        verification: 'reproduced',
      },
      {
        content: '쿠폰 만료 시각 경계값 오류',
        location: 'src/coupons/apply.py · 알려진 결함 3번',
        input: 2,
        methods: ['baseline'],
        verification: 'reproduced',
      },
    ],
    raw: [
      ['test_cancel.py · 테스트 7개 · 모두 통과\n배송 전 취소, 배송 후 취소 거부를 검증해요.', 'test_cancel.py · 테스트 9개 · 모두 통과\n배송 전 취소를 검증해요.'],
      ['test_refund_rollback.py · 테스트 4개\n환불 실패 시 주문 상태가 되돌아가는지 검증해요.', 'test_refund.py · 테스트 5개\n목(mock) 대신 실제 DB를 호출해요.'],
      ['test_coupon_expiry.py · 테스트 3개\n만료 1초 전·후 경계값을 검증해요.', 'test_coupon.py · 테스트 4개\n만료 경계값 검증이 없어요.'],
    ],
    verdict: 'baseline_better',
    reason: '속도는 빨라졌지만, 등록한 필수 조건 2개(확인된 결함 놓치지 않기, 프로젝트 규칙 지키기)를 지키지 못했어요.',
    ai_note: {
      summary: '후보 방식은 더 빨랐지만 알려진 결함 3건 중 2건을 잡지 못했고, 프로젝트 규칙(목 사용 방식) 2개를 지키지 않았어요.',
      next_check: null,
    },
    executed_at: at(-2, 16, 40),
  }),
  /** 시나리오 D: 판단 보류 (한쪽 실행 실패) */
  cmp_c: build({
    ...prBase,
    id: 'cmp_c',
    metrics: reviewMetrics(),
    verdict: 'inconclusive',
    reason: '후보 방식이 작업 1건(#119 결제 재시도)에서 시간 초과(180초)로 끝나서, 두 방식을 같은 조건으로 비교하지 못했어요.',
    ai_note: null,
    failures: [[2, 'candidate', 'timeout', '시간 초과 (180초)']],
  }),
  cmp_d: build({
    ...prBase,
    id: 'cmp_d',
    metrics: reviewMetrics([
      [0.07, 0.14],
      [0.07, 0.14],
      [0.07, 0.15],
    ]),
    verdict: 'depends_on_criteria',
    reason: '확인된 문제는 2건 더 찾았지만, 비용이 약 2배 늘었어요. 품질과 비용 중 무엇을 더 중요하게 보는지에 따라 달라요.',
    ai_note: null,
  }),
  cmp_e: build({
    ...prBase,
    id: 'cmp_e',
    metrics: reviewMetrics().map((d) => ({
      ...d,
      values: d.values.map(([b]) => [b, b]) as [number, number][],
    })),
    findings: reviewFindings.map((f) => ({
      ...f,
      methods: ['baseline', 'candidate'] as Method[],
    })),
    verdict: 'no_difference',
    reason: '측정하고 검증한 주요 지표가 같아요. 이번 작업에서는 바꿔도 달라지는 점이 확인되지 않았어요.',
    ai_note: null,
  }),
  /** 양쪽 실행 실패 → 에러 화면 */
  cmp_fail: build({
    ...prBase,
    id: 'cmp_fail',
    metrics: reviewMetrics(),
    status: 'failed',
    verdict: 'inconclusive',
    reason: '두 방식 모두 실행하지 못했어요.',
    ai_note: null,
    failures: [0, 1, 2].flatMap(
      (i) =>
        [
          [i, 'baseline', 'failed', '모델 API 응답 시간 초과'],
          [i, 'candidate', 'failed', '모델 API 응답 시간 초과'],
        ] as [number, Method, 'failed', string][],
    ),
  }),
}

/** 홈 카드에 붙는 최근 비교 요약 */
export const latestByMatch: Record<string, { id: string; highlights: string[] }> = {
  mt_tw: {
    id: 'cmp_b',
    highlights: ['결함 탐지 3건 중 1건', '규칙 준수 4개 중 2개', '실행 시간 54초 단축'],
  },
}

// ── 비교 준비 ───────────────────────────────────────────

export const inputOptions: {
  id: string
  kind: 'pr' | 'files' | 'example'
  label: string
  meta: string
}[] = [
  {
    id: 'in_128',
    kind: 'pr',
    label: '#128 주문 취소 API 추가',
    meta: '기준 a41c9e2 → 변경 7be03d1 · 파일 6개',
  },
  {
    id: 'in_124',
    kind: 'pr',
    label: '#124 쿠폰 중복 적용 수정',
    meta: '기준 9d2f7a0 → 변경 c5518ab · 파일 3개',
  },
  {
    id: 'in_119',
    kind: 'pr',
    label: '#119 결제 재시도 로직 변경',
    meta: '기준 31e8c4f → 변경 e07a2d9 · 파일 4개',
  },
  {
    id: 'in_117',
    kind: 'pr',
    label: '#117 README 오타 수정',
    meta: '기준 5aa90b1 → 변경 0c3e7f4 · 파일 1개',
  },
  {
    id: 'in_files_orders',
    kind: 'files',
    label: 'src/orders/',
    meta: '주문 모듈 · 파일 5개 · 최근 7일 동안 12번 수정',
  },
  {
    id: 'in_files_coupons',
    kind: 'files',
    label: 'src/coupons/',
    meta: '쿠폰 모듈 · 파일 3개 · 최근 7일 동안 5번 수정',
  },
  {
    id: 'in_files_payments',
    kind: 'files',
    label: 'src/payments/',
    meta: '결제 모듈 · 파일 4개 · 최근 7일 동안 3번 수정',
  },
  {
    id: 'in_example',
    kind: 'example',
    label: '예제 쇼핑몰 프로젝트 · 리뷰 3건',
    meta: '알려진 결함 목록 포함 · 예제 결과로 표시돼요',
  },
]

// ── 이력 ────────────────────────────────────────────────

export const history: DecisionLog[] = [
  {
    id: 'log_7',
    user_id: 'usr_001',
    change_id: 'chg_pr',
    change_title: '코드 리뷰 스킬 pr-review 2.1.0 공개',
    action: 'switch',
    summary: '리뷰 프롬프트 직접 붙여넣기 → pr-review 2.1.0',
    reason: '확인된 문제를 더 찾았고 놓친 것이 없어서',
    at: at(0, 14, 32),
    comparison_id: 'cmp_a',
    switch_id: 'sw_pr',
  },
  {
    id: 'log_6',
    user_id: 'usr_001',
    change_id: 'chg_pr',
    change_title: '코드 리뷰 스킬 pr-review 2.1.0 공개',
    action: 'compared',
    summary: '확인된 문제 4건 → 6건, 놓친 문제 0건 (작업 3개 합계)',
    reason: null,
    at: at(0, 14, 20),
    comparison_id: 'cmp_a',
  },
  {
    id: 'log_5',
    user_id: 'usr_001',
    change_id: 'chg_tw',
    change_title: '테스트 작성 스킬 test-writer 0.9.0 공개',
    action: 'keep',
    summary: '이번 비교에서는 기존 방식이 유리',
    reason: '알려진 결함 3건 중 1건만 잡아서',
    at: at(-2, 16, 48),
    comparison_id: 'cmp_b',
  },
  {
    id: 'log_4',
    user_id: 'usr_001',
    change_id: 'chg_tw',
    change_title: '테스트 작성 스킬 test-writer 0.9.0 공개',
    action: 'compared',
    summary: '결함 탐지 3건 중 3건 → 3건 중 1건 (작업 3개 합계)',
    reason: null,
    at: at(-2, 16, 40),
    comparison_id: 'cmp_b',
  },
  {
    id: 'log_3',
    user_id: 'usr_001',
    change_id: 'chg_attach',
    change_title: '테스트 실행 결과 자동 첨부 설정 추가',
    action: 'later',
    summary: `${new Date(at(5, 9, 0)).getMonth() + 1}.${new Date(at(5, 9, 0)).getDate()}에 다시 보여 드려요`,
    reason: null,
    at: at(-2, 10, 5),
  },
  {
    id: 'log_2',
    user_id: 'usr_001',
    change_id: 'chg_ch041',
    change_title: '커밋 메시지 스킬 commit-helper 0.4.1',
    action: 'rolled_back',
    summary: 'commit-helper 0.4.1 → 이전 방식으로 복원 완료',
    reason: '결과가 나빠짐',
    at: at(-7, 17, 12),
    switch_id: 'sw_ch',
    stale_environment: true,
  },
  {
    id: 'log_1',
    user_id: 'usr_001',
    change_id: 'chg_doc',
    change_title: '문서화 스킬 doc-gen 1.0.0 공개',
    action: 'not_interested',
    summary: '숨긴 변화 목록으로 옮겼어요',
    reason: '문서화 작업은 하지 않아서',
    at: at(-7, 11, 30),
  },
]

export const backups = [
  {
    switch_id: 'sw_pr',
    title: 'pr-review 2.1.0 교체',
    taken_at: at(0, 14, 32),
    applied: true,
  },
  {
    switch_id: 'sw_ch',
    title: 'commit-helper 0.4.1 교체',
    taken_at: at(-7, 17, 0),
    applied: false,
  },
  {
    switch_id: 'sw_lint',
    title: 'lint-fix 1.8.0 교체',
    taken_at: at(-12, 11, 0),
    applied: false,
  },
]
