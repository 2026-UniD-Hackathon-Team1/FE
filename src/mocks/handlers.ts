import { delay, http, HttpResponse } from 'msw'
import * as db from './data'
import type { Comparison, ComparisonStatus, DecisionLog, FindingVerification, Switch } from '../types/domain'
import type { AgentInfo, DecisionBody, EnvItemInput, MatchedChange, RollbackBody, StartComparisonBody, SwitchBody, SwitchPreview } from '../types/api'

/*
 * 개발용 상태 전환 (브라우저 콘솔에서 localStorage.setItem(...) 후 새로고침)
 *   mock:logged_in = '0'            → 로그인 화면
 *   mock:agent     = 'disconnected' → 연결 끊김 배너 / 'waiting' → 온보딩 연결 대기
 *   mock:empty     = '1'            → 홈 빈 상태
 *   mock:perm      = '1'            → 온보딩 권한 필요
 */
const flag = (k: string) => (typeof localStorage === 'undefined' ? null : localStorage.getItem(k))

const err = (status: number, code: string, message: string) => HttpResponse.json({ error: { code, message } }, { status })

/** 새 비교는 시간 경과에 따라 상태가 진행되는 것처럼 흉내낸다 */
const startedAt = new Map<string, number>()
const STEPS: ComparisonStatus[] = ['queued', 'running_baseline', 'running_candidate', 'evaluating', 'done']
const STEP_MS = 3000

function withProgress(c: Comparison): Comparison {
  const t0 = startedAt.get(c.id)
  if (t0 === undefined || c.status === 'cancelled') return c
  const step = Math.min(Math.floor((Date.now() - t0) / STEP_MS), STEPS.length - 1)
  return { ...c, status: STEPS[step], verdict: step === STEPS.length - 1 ? c.verdict : null }
}

function log(entry: Omit<DecisionLog, 'id' | 'user_id' | 'at' | 'change_title'>) {
  const title = db.changes.find((c) => c.id === entry.change_id)?.title ?? ''
  db.history.unshift({ ...entry, id: `log_${Date.now()}`, user_id: 'usr_001', change_title: title, at: new Date().toISOString() })
}

const changeIdOfMatch = (matchId: string) => db.matches.find((m) => m.id === matchId)?.change_id ?? ''

/** 비교 응답에 후보와 변화 정보를 붙인다 */
function expand(c: Comparison): Comparison {
  const change = db.changes.find((x) => x.id === changeIdOfMatch(c.match_id))
  return { ...c, candidate: db.candidates.find((x) => x.id === c.candidate_id), change: change ? { id: change.id, title: change.title } : undefined }
}

function matched(statusFilter: (s: string) => boolean): MatchedChange[] {
  return db.matches
    .filter((m) => statusFilter(m.status))
    .map((match) => {
      const latest = db.latestByMatch[match.id]
      const cmp = latest ? db.comparisons[latest.id] : undefined
      const cand = db.candidates.find((c) => c.change_id === match.change_id)
      return {
        match,
        change: db.changes.find((c) => c.id === match.change_id)!,
        candidate_id: cand?.id ?? null,
        support_level: cand?.support_level ?? null,
        latest_comparison: cmp && cmp.verdict ? { id: cmp.id, verdict: cmp.verdict, highlights: latest.highlights, executed_at: cmp.executed_at ?? '', run_count: cmp.run_count } : null,
      }
    })
}

let agentStatus: AgentInfo['status'] = 'connected'
let waitingSince = 0
const switches = new Map<string, Switch & { conflict?: boolean }>([
  ['sw_pr', { id: 'sw_pr', comparison_id: 'cmp_a', changes: [], applied_at: db.at(0, 14, 32), result: 'success', rolled_back: false, conflict: true }],
  ['sw_ch', { id: 'sw_ch', comparison_id: 'cmp_a', changes: [], applied_at: db.at(-7, 17, 0), result: 'success', rolled_back: true }],
])

export const handlers = [
  // ── 계정 ──
  http.get('/api/me', () =>
    flag('mock:logged_in') === '0'
      ? err(401, 'UNAUTHORIZED', '로그인이 필요해요')
      : HttpResponse.json({ id: 'usr_001', login: 'yijun', name: '김이준', avatar_url: null }),
  ),
  http.post('/auth/logout', () => {
    localStorage.setItem('mock:logged_in', '0')
    return new HttpResponse(null, { status: 204 })
  }),

  // ── 프로젝트·연결 프로그램 ──
  http.get('/api/projects/:id', () =>
    HttpResponse.json({ id: 'prj_001', user_id: 'usr_001', name: 'shop-api', work_dir: '~/work/shop-api', access_scope: ['읽기', '스킬·설정 쓰기'], connection: agentStatus === 'disconnected' ? 'disconnected' : 'connected', comparison_count: 12, backups: db.backups }),
  ),
  http.delete('/api/projects/:id', async () => {
    await delay(400)
    agentStatus = 'disconnected'
    localStorage.setItem('mock:agent', 'disconnected')
    return new HttpResponse(null, { status: 204 })
  }),
  http.delete('/api/projects/:id/data', async ({ request }) => {
    await delay(400)
    const kind = new URL(request.url).searchParams.get('kind')
    if (kind === 'backups') db.backups.splice(0)
    return new HttpResponse(null, { status: 204 })
  }),
  http.get('/api/projects/:id/agent', () => {
    // 개발용 플래그가 없으면 연결된 상태로 돌아온다 (연결 대기 중은 그대로)
    if (agentStatus !== 'waiting') agentStatus = (flag('mock:agent') as AgentInfo['status'] | null) ?? 'connected'
    if (agentStatus === 'waiting' && Date.now() - waitingSince > 5000) {
      agentStatus = 'connected'
      localStorage.removeItem('mock:agent')
    }
    const connected = agentStatus === 'connected'
    return HttpResponse.json({ status: agentStatus, device: connected ? 'MacBook-Pro' : null, version: connected ? 'galtalka 0.1.0' : null, last_seen_at: connected ? new Date().toISOString() : db.at(0, 14, 2) } satisfies AgentInfo)
  }),
  http.post('/api/projects/:id/agent/code', async () => {
    await delay(300)
    agentStatus = 'waiting'
    waitingSince = Date.now()
    return HttpResponse.json({ code: '4F7K-92QD', command: 'npx galtalka connect 4F7K-92QD', expires_at: new Date(Date.now() + 10 * 60_000).toISOString() })
  }),

  // ── 환경 ──
  http.get('/api/projects/:id/environment', async () => {
    await delay(300)
    if (flag('mock:perm') === '1') return err(403, 'PERMISSION_REQUIRED', '설정 파일을 읽을 권한이 없어요')
    return HttpResponse.json(db.environment)
  }),
  http.post('/api/projects/:id/environment/recheck', async () => {
    await delay(900)
    db.environment.last_checked_at = new Date().toISOString()
    return HttpResponse.json({ checked_at: db.environment.last_checked_at, changes: [{ label: 'AI 코딩 도구', before: '1.4.2', after: '1.5.0' }, { label: 'lint-fix 스킬', before: '1.8.0', after: '1.9.0' }, { label: 'doc-gen 스킬', before: '없음', after: '1.0.0 새로 설치' }] })
  }),
  http.post('/api/projects/:id/environment/items', async ({ request }) => {
    const b = (await request.json()) as EnvItemInput
    const item = { name: b.name, version: b.version, source: b.source ?? '직접 입력', last_checked_at: new Date().toISOString(), excluded: b.excluded }
    if (b.kind === 'model') db.environment.model = item
    else if (b.kind === 'tool') db.environment.tool = item
    else if (b.kind === 'skill') db.environment.skills.push(item)
    else db.environment.config_files.push({ path: b.name, summary: b.source ?? '직접 입력' })
    return HttpResponse.json(db.environment)
  }),
  http.get('/api/projects/:id/work-methods', () => HttpResponse.json(db.workMethods)),

  // ── 변화 ──
  http.get('/api/changes/hidden', () => HttpResponse.json(matched((s) => s === 'dismissed'))),
  http.get('/api/changes', async () => {
    await delay(250)
    if (flag('mock:empty') === '1') return HttpResponse.json([])
    return HttpResponse.json(matched((s) => s !== 'dismissed'))
  }),
  http.get('/api/changes/:id', ({ params }) => {
    const change = db.changes.find((c) => c.id === params.id)
    const match = db.matches.find((m) => m.change_id === params.id)
    if (!change || !match) return err(404, 'NOT_FOUND', '변화를 찾을 수 없어요')
    const latest = matched((s) => s === match.status).find((x) => x.match.id === match.id)?.latest_comparison ?? null
    return HttpResponse.json({ change, match, candidates: db.candidates.filter((c) => c.change_id === change.id), latest_comparison: latest })
  }),
  http.post('/api/matches/:id/unhide', ({ params }) => {
    const m = db.matches.find((x) => x.id === params.id)
    if (m) m.status = 'new'
    return new HttpResponse(null, { status: 204 })
  }),
  http.post('/api/matches/:id/decision', async ({ params, request }) => {
    const body = (await request.json()) as DecisionBody
    const m = db.matches.find((x) => x.id === params.id)
    if (!m) return err(404, 'NOT_FOUND', '변화 카드를 찾을 수 없어요')
    m.status = body.action === 'keep' ? 'kept' : body.action === 'later' ? 'snoozed' : body.action === 'not_interested' ? 'dismissed' : m.status
    if (body.action === 'later') m.snoozed_until = db.at(7, 9, 0)
    log({ change_id: m.change_id, action: body.action, summary: null, reason: body.reason ?? null })
    return new HttpResponse(null, { status: 204 })
  }),

  // ── 비교 ──
  http.get('/api/comparisons/prepare', ({ request }) => {
    const cand = new URL(request.url).searchParams.get('candidate') ?? ''
    if (!db.candidates.some((c) => c.id === cand)) return err(404, 'NOT_FOUND', '비교 가능한 후보가 아니에요')
    return HttpResponse.json(db.prepFor(cand))
  }),
  http.post('/api/comparisons', async ({ request }) => {
    const body = (await request.json()) as StartComparisonBody
    const base = Object.values(db.comparisons).find((c) => c.candidate_id === body.candidate_id && c.status === 'done') ?? db.comparisons.cmp_a
    const id = `cmp_${Date.now()}`
    db.comparisons[id] = { ...base, id, match_id: body.match_id, is_prerecorded: false, executed_at: new Date().toISOString() }
    startedAt.set(id, Date.now())
    log({ change_id: changeIdOfMatch(body.match_id), action: 'compared', summary: null, reason: null, comparison_id: id })
    return HttpResponse.json(withProgress(db.comparisons[id]), { status: 201 })
  }),
  http.get('/api/comparisons/:id', async ({ params }) => {
    await delay(200)
    const c = db.comparisons[params.id as string]
    if (!c) return err(404, 'NOT_FOUND', '비교 기록을 찾을 수 없어요')
    return HttpResponse.json(expand(withProgress(c)))
  }),
  http.post('/api/comparisons/:id/cancel', ({ params }) => {
    const c = db.comparisons[params.id as string]
    if (!c) return err(404, 'NOT_FOUND', '비교 기록을 찾을 수 없어요')
    db.comparisons[c.id] = { ...withProgress(c), status: 'cancelled', verdict: 'inconclusive' }
    startedAt.delete(c.id)
    return HttpResponse.json(expand(db.comparisons[c.id]))
  }),
  http.post('/api/comparisons/:id/rerun', ({ params }) => {
    const c = db.comparisons[params.id as string]
    if (!c) return err(404, 'NOT_FOUND', '비교 기록을 찾을 수 없어요')
    const base = db.comparisons.cmp_a
    const id = `cmp_${Date.now()}`
    db.comparisons[id] = { ...base, id, match_id: c.match_id, is_prerecorded: false, executed_at: new Date().toISOString() }
    startedAt.set(id, Date.now())
    return HttpResponse.json(withProgress(db.comparisons[id]), { status: 201 })
  }),
  http.patch('/api/findings/:id', async ({ params, request }) => {
    const body = (await request.json()) as { verification: FindingVerification; user_note?: string }
    // 같은 묶음(group_id)의 지적은 함께 바꾼다
    let group: string | null = null
    for (const c of Object.values(db.comparisons)) for (const r of c.results) for (const f of r.findings) if (f.id === params.id) group = f.group_id
    if (!group) return err(404, 'NOT_FOUND', '지적 항목을 찾을 수 없어요')
    for (const c of Object.values(db.comparisons))
      for (const r of c.results)
        for (const f of r.findings)
          if (f.group_id === group) {
            f.history.push({ at: new Date().toISOString(), from: f.verification, to: body.verification, note: body.user_note ?? null })
            f.verification = body.verification
            f.user_note = body.user_note ?? f.user_note
          }
    return HttpResponse.json({ ok: true })
  }),

  // ── 교체와 복원 ──
  http.get('/api/comparisons/:id/switch-preview', ({ params }) => {
    const c = db.comparisons[params.id as string]
    if (!c) return err(404, 'NOT_FOUND', '비교 기록을 찾을 수 없어요')
    const cand = db.candidates.find((x) => x.id === c.candidate_id)!
    const preview: SwitchPreview = {
      candidate_label: c.conditions.candidate_label,
      changes: [
        { kind: 'skill', target: c.conditions.candidate_label, before: null, after: cand.pinned_version, note: '비교에 쓴 버전 그대로' },
        { kind: 'setting', target: '.tool/settings.json', before: null, after: '2줄 추가', note: '2줄 추가' },
        { kind: 'file', target: '리뷰 프롬프트.md', before: '사용 중', after: '사용 안 함', note: '지우지 않고 그대로 둬요' },
      ],
      additional_permissions: cand.permissions.filter((p) => p.is_additional),
      env_changes: c.id === 'cmp_d' ? [{ label: 'AI 코딩 도구', before: '1.4.2', after: '1.5.0' }, { label: 'lint-fix 스킬', before: '1.8.0', after: '1.9.0' }] : [],
      env_checked_at: new Date().toISOString(),
      manual: cand.support_level !== 'switchable',
      manual_steps: [
        { title: '스킬 폴더 복사', command: `git clone --depth 1 ${cand.repository_url} && cp -r ${cand.repository_url.split('/').pop()}/skill .tool/skills/` },
        { title: '프롬프트 대신 스킬을 쓰도록 설정', command: `.tool/settings.json → "review": { "mode": "skill", "skill": "${cand.repository_url.split('/').pop()}" }` },
      ],
    }
    return HttpResponse.json(preview)
  }),
  http.post('/api/switches', async ({ request }) => {
    const body = (await request.json()) as Partial<SwitchBody>
    if (body.confirmed !== true) return err(400, 'CONFIRMATION_REQUIRED', '사용자 확인 없이 교체할 수 없어요')
    const c = body.comparison_id ? db.comparisons[body.comparison_id] : undefined
    if (!c) return err(404, 'NOT_FOUND', '비교 기록을 찾을 수 없어요')
    await delay(1200)
    // cmp_e로 바꾸면 실패 → 자동 복원 흐름을 볼 수 있다 (FR-31)
    const failed = c.id === 'cmp_e'
    const sw: Switch = { id: `sw_${Date.now()}`, comparison_id: c.id, changes: [], applied_at: new Date().toISOString(), result: failed ? 'auto_restored' : 'success', rolled_back: false }
    switches.set(sw.id, sw)
    if (!failed) {
      const m = db.matches.find((x) => x.id === c.match_id)
      if (m) m.status = 'switched'
      db.backups.unshift({ switch_id: sw.id, title: `${c.conditions.candidate_label} 교체`, taken_at: sw.applied_at!, applied: true })
      log({ change_id: changeIdOfMatch(c.match_id), action: 'switch', summary: `${c.conditions.baseline_label} → ${c.conditions.candidate_label}`, reason: null, comparison_id: c.id, switch_id: sw.id })
    }
    return HttpResponse.json(sw, { status: 201 })
  }),
  http.post('/api/switches/:id/rollback', async ({ params, request }) => {
    const body = (await request.json()) as RollbackBody
    const sw = switches.get(params.id as string)
    if (!sw) return err(404, 'NOT_FOUND', '교체 기록을 찾을 수 없어요')
    if (sw.rolled_back) return err(409, 'ALREADY_ROLLED_BACK', '이미 되돌린 교체예요')
    if (sw.conflict && !body.conflict_strategy) return err(409, 'CONFLICT', '.tool/settings.json')
    await delay(1000)
    sw.rolled_back = true
    const c = db.comparisons[sw.comparison_id]
    const m = db.matches.find((x) => x.id === c?.match_id)
    if (m) m.status = 'rolled_back'
    const b = db.backups.find((x) => x.switch_id === sw.id)
    if (b) b.applied = false
    log({ change_id: m?.change_id ?? '', action: 'rolled_back', summary: `${c?.conditions.candidate_label} → 이전 방식으로 복원 완료`, reason: body.reason === 'worse_result' ? '결과가 나빠짐' : body.reason === 'inconvenient' ? '쓰기 불편함' : (body.note ?? '기타'), switch_id: sw.id })
    return HttpResponse.json(sw)
  }),

  http.get('/api/history', () => HttpResponse.json(db.history)),
]
