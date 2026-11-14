// 비교 결과 집계: 작업별 결과를 지표 표, 놓친 것, 검증 의견으로 바꾼다 (5.4장)
import type { Candidate, Comparison, EvidenceKind, FindingVerification, Method } from '../../types/domain'
import { compatibilityLabel, permissionLabel, provenanceLabel } from '../../lib/labels'

/** 값이 작을수록 좋은 지표. 차이 문구에만 쓰고 색으로 우열을 칠하지 않는다 (P1) */
const LOWER_IS_BETTER = new Set(['false_positive', 'missed', 'duration', 'cost'])

export interface MetricRow {
  key: string
  label: string
  unit: string
  evidence: EvidenceKind
  baseline: number | null
  candidate: number | null
  total: number | null
  diff: string
}

const fmtNum = (v: number, unit: string) => (unit === '달러' ? v.toFixed(2) : String(Math.round(v * 100) / 100))

export function formatValue(v: number | null, unit: string, total: number | null): string {
  if (v === null) return '측정 실패'
  if (total) return `${total}${unit} 중 ${fmtNum(v, unit)}${unit}`
  if (unit === '달러') return `약 ${fmtNum(v, unit)}${unit}`
  return `${fmtNum(v, unit)}${unit}`
}

function diffText(key: string, unit: string, b: number | null, c: number | null): string {
  if (b === null || c === null) return '비교 불가'
  const d = c - b
  if (Math.abs(d) < 1e-9) return '같음'
  const amount = `${d > 0 ? '▲' : '▼'} ${unit === '달러' ? '약 ' : ''}${fmtNum(Math.abs(d), unit)}${unit}`
  if (key === 'duration') return `${amount} ${d < 0 ? '짧음' : '김'}`
  return `${amount} ${d > 0 ? '많음' : '적음'}`
}

/** 두 방식 모두 성공한 작업만 합산한다. 실패하거나 제외된 작업 수도 함께 돌려준다 */
export function aggregate(c: Comparison) {
  const okInputs = c.inputs.filter((i) => c.results.filter((r) => r.input_id === i.id).every((r) => r.run_status === 'success'))
  const failedInputs = c.inputs.filter((i) => !okInputs.includes(i))
  const first = c.results.find((r) => r.method === 'baseline')
  const rows: MetricRow[] = (first?.metrics ?? []).map((m) => {
    const sum = (method: Method) => {
      const vals = okInputs.map((i) => c.results.find((r) => r.input_id === i.id && r.method === method)?.metrics.find((x) => x.key === m.key)?.value ?? null)
      return vals.length && vals.every((v) => v !== null) ? vals.reduce((a, b) => a! + b!, 0) : null
    }
    const totals = okInputs.map((i) => c.results.find((r) => r.input_id === i.id)?.metrics.find((x) => x.key === m.key)?.total ?? null)
    const total = totals.length && totals.every((t) => t) ? totals.reduce((a, b) => a! + b!, 0) : null
    const b = sum('baseline')
    const cv = sum('candidate')
    return { key: m.key, label: m.label, unit: m.unit, evidence: m.evidence, baseline: b, candidate: cv, total, diff: diffText(m.key, m.unit, b, cv) }
  })
  return { rows, okInputs, failedInputs }
}

export const isLowerBetter = (key: string) => LOWER_IS_BETTER.has(key)

export interface FindingGroup {
  id: string
  /** 대표 지적 id (판정 수정에 쓴다) */
  findingId: string
  content: string
  location: string
  methods: Method[]
  verification: FindingVerification
  inputLabel: string
  historyCount: number
}

/** 두 방식이 같은 문제를 지적하면 하나로 묶는다 (FR-25) */
export function findingGroups(c: Comparison): FindingGroup[] {
  const map = new Map<string, FindingGroup>()
  for (const r of c.results)
    for (const f of r.findings) {
      const key = f.group_id ?? f.id
      const g = map.get(key)
      if (g) {
        if (!g.methods.includes(r.method)) g.methods.push(r.method)
      } else {
        map.set(key, {
          id: key,
          findingId: f.id,
          content: f.content,
          location: f.location,
          methods: [r.method],
          verification: f.verification,
          inputLabel: c.inputs.find((i) => i.id === r.input_id)?.label ?? '',
          historyCount: f.history.length,
        })
      }
    }
  return [...map.values()]
}

export const methodsLabel = (m: Method[]) => (m.length === 2 ? '두 방식 모두' : m[0] === 'baseline' ? '기존 방식만' : '후보 방식만')

/** 후보 방식이 놓친 것: 기존 방식만 찾았고 확인된 문제 */
export function missedByCandidate(groups: FindingGroup[]) {
  return groups.filter((g) => g.methods.length === 1 && g.methods[0] === 'baseline' && (g.verification === 'reproduced' || g.verification === 'user_confirmed'))
}

export const confirmedByBaseline = (groups: FindingGroup[]) =>
  groups.filter((g) => g.methods.includes('baseline') && (g.verification === 'reproduced' || g.verification === 'user_confirmed')).length

/** 접힌 줄에 보이는 한 줄 요약. "안전함"이라고 쓰지 않는다 (P6) */
export function safetySummary(c: Candidate) {
  const extra = c.permissions.filter((p) => p.is_additional)
  return [
    `${provenanceLabel[c.provenance]} 출처`,
    compatibilityLabel[c.compatibility],
    extra.length ? `추가 권한 ${extra.length}개(${extra.map((p) => permissionLabel[p.kind]).join(', ')})` : '추가 권한 없음',
    c.risk_signals.length ? `위험 신호 ${c.risk_signals.length}개` : '확인된 위험 신호 없음',
  ].join(' · ')
}

// ── 결과물 비교 (설계서 수정안: 자동 판정 대신 사용자 선택) ─────────────
// 백엔드는 실행 시간만 잰다. 아래 숫자는 전부 두 결과물에서 센 사실이고, 우열을 정하지 않는다.

export type Overlap = 'both' | 'baseline_only' | 'candidate_only'

export interface SideFinding {
  id: string
  method: Method
  inputId: string
  location: string
  content: string
  severity: string | null
  overlap: Overlap
}

const parseLocation = (loc: string) => {
  const m = loc.match(/^(.*?):(\d+)$/)
  return m ? { path: m[1], line: Number(m[2]) } : { path: loc, line: null as number | null }
}

/** 같은 파일에서 줄 번호가 3줄 이내면 같은 문제로 본다 (대략적인 자동 대조) */
const sameSpot = (a: string, b: string) => {
  const x = parseLocation(a)
  const y = parseLocation(b)
  if (x.path !== y.path) return false
  if (x.line === null || y.line === null) return x.line === y.line
  return Math.abs(x.line - y.line) <= 3
}

/** 작업 하나의 두 결과물 지적을 서로 맞춰 본다 */
export function sideBySide(c: Comparison, inputId: string) {
  const of = (m: Method) => c.results.find((r) => r.input_id === inputId && r.method === m)
  const base = of('baseline')
  const cand = of('candidate')
  const bf = base?.findings ?? []
  const cf = cand?.findings ?? []
  const toSide = (list: typeof bf, method: Method, other: typeof bf): SideFinding[] =>
    list.map((f) => ({
      id: f.id,
      method,
      inputId,
      location: f.location,
      content: f.content,
      severity: f.severity,
      overlap: other.some((o) => (f.group_id && o.group_id === f.group_id) || sameSpot(o.location, f.location))
        ? 'both'
        : method === 'baseline'
          ? 'baseline_only'
          : 'candidate_only',
    }))
  return { base, cand, baseline: toSide(bf, 'baseline', cf), candidate: toSide(cf, 'candidate', bf) }
}

export interface Glance {
  findings: Record<Method, number>
  severity: Record<Method, Record<string, number>>
  seconds: Record<Method, number | null>
  cost: Record<Method, string | null>
  /** 둘 다 찾은 지적(기존 기준) · 기존만 · 후보만 */
  overlap: { both: number; baseline_only: number; candidate_only: number }
  okInputs: number
}

/** 한눈에 비교: 두 방식 모두 성공한 작업만 센다 */
export function glance(c: Comparison): Glance {
  const ok = c.inputs.filter((i) => c.results.filter((r) => r.input_id === i.id).every((r) => r.run_status === 'success'))
  const g: Glance = {
    findings: { baseline: 0, candidate: 0 },
    severity: { baseline: {}, candidate: {} },
    seconds: { baseline: 0, candidate: 0 },
    cost: { baseline: null, candidate: null },
    overlap: { both: 0, baseline_only: 0, candidate_only: 0 },
    okInputs: ok.length,
  }
  for (const i of ok) {
    const s = sideBySide(c, i.id)
    for (const [m, list, r] of [
      ['baseline', s.baseline, s.base],
      ['candidate', s.candidate, s.cand],
    ] as const) {
      g.findings[m] += list.length
      for (const f of list) g.severity[m][f.severity ?? '미지정'] = (g.severity[m][f.severity ?? '미지정'] ?? 0) + 1
      const sec = r?.duration_ms != null ? r.duration_ms / 1000 : null
      g.seconds[m] = sec === null || g.seconds[m] === null ? null : g.seconds[m]! + sec
      if (r?.usage.cost) g.cost[m] = r.usage.cost
    }
    g.overlap.both += s.baseline.filter((f) => f.overlap === 'both').length
    g.overlap.baseline_only += s.baseline.filter((f) => f.overlap === 'baseline_only').length
    g.overlap.candidate_only += s.candidate.filter((f) => f.overlap === 'candidate_only').length
  }
  return g
}

export type Choice = 'baseline' | 'candidate' | 'abstain'

/** 비교의 verdict는 이제 사용자가 고른 값이다 */
export function choiceOf(c: Comparison): Choice | null {
  if (c.verdict === 'candidate_better') return 'candidate'
  if (c.verdict === 'baseline_better') return 'baseline'
  if (c.verdict === 'inconclusive') return 'abstain'
  return null
}
