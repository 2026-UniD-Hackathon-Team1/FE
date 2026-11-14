import { delay, http, HttpResponse } from 'msw'
import * as db from './data'
import type { Comparison, ComparisonStatus, DecisionLog, Switch } from '../types/domain'
import type { DecisionBody, RollbackBody, StartComparisonBody, SwitchBody } from '../types/api'

const err = (status: number, code: string, message: string) =>
  HttpResponse.json({ error: { code, message } }, { status })

/** 새 비교는 시간 경과에 따라 상태가 진행되는 것처럼 흉내낸다 */
const startedAt = new Map<string, number>()
const STEPS: ComparisonStatus[] = ['queued', 'running_baseline', 'running_candidate', 'evaluating', 'done']
const STEP_MS = 1500

function withProgress(c: Comparison): Comparison {
  const t0 = startedAt.get(c.id)
  if (t0 === undefined || c.status === 'cancelled') return c
  const step = Math.min(Math.floor((Date.now() - t0) / STEP_MS), STEPS.length - 1)
  return { ...c, status: STEPS[step], verdict: step === STEPS.length - 1 ? c.verdict : null }
}

const switches = new Map<string, Switch>()

function log(entry: Omit<DecisionLog, 'id' | 'user_id' | 'at' | 'change_title'>) {
  const title = db.changes.find((c) => c.id === entry.change_id)?.title ?? ''
  db.history.unshift({
    ...entry,
    id: `log_${db.history.length + 1}`,
    user_id: 'usr_001',
    change_title: title,
    at: new Date().toISOString(),
  })
}

const changeIdOfMatch = (matchId: string) => db.matches.find((m) => m.id === matchId)?.change_id ?? ''

export const handlers = [
  http.get('/api/projects/:id/environment', () => HttpResponse.json(db.environment)),
  http.get('/api/projects/:id/work-methods', () => HttpResponse.json(db.workMethods)),

  http.get('/api/changes', async () => {
    await delay(200)
    const visible = db.matches.filter((m) => m.status !== 'dismissed' && m.status !== 'snoozed')
    return HttpResponse.json(
      visible.map((match) => ({ match, change: db.changes.find((c) => c.id === match.change_id)! })),
    )
  }),

  http.get('/api/changes/:id', ({ params }) => {
    const change = db.changes.find((c) => c.id === params.id)
    const match = db.matches.find((m) => m.change_id === params.id)
    if (!change || !match) return err(404, 'NOT_FOUND', '변화를 찾을 수 없어요')
    return HttpResponse.json({
      change,
      match,
      candidates: db.candidates.filter((c) => c.change_id === change.id),
    })
  }),

  http.post('/api/comparisons', async ({ request }) => {
    const body = (await request.json()) as StartComparisonBody
    const base = Object.values(db.comparisons).find((c) => c.candidate_id === body.candidate_id)
    if (!base) return err(404, 'NOT_FOUND', '비교 가능한 후보가 아니에요')
    const id = `cmp_${Date.now()}`
    db.comparisons[id] = { ...base, id, match_id: body.match_id, is_prerecorded: false, executed_at: new Date().toISOString() }
    startedAt.set(id, Date.now())
    log({ change_id: changeIdOfMatch(body.match_id), action: 'compared', summary: null, reason: null })
    return HttpResponse.json(withProgress(db.comparisons[id]), { status: 201 })
  }),

  http.get('/api/comparisons/:id', ({ params }) => {
    const c = db.comparisons[params.id as string]
    if (!c) return err(404, 'NOT_FOUND', '비교 기록을 찾을 수 없어요')
    return HttpResponse.json(withProgress(c))
  }),

  http.post('/api/comparisons/:id/cancel', ({ params }) => {
    const c = db.comparisons[params.id as string]
    if (!c) return err(404, 'NOT_FOUND', '비교 기록을 찾을 수 없어요')
    db.comparisons[c.id] = { ...withProgress(c), status: 'cancelled', verdict: 'inconclusive' }
    return HttpResponse.json(db.comparisons[c.id])
  }),

  http.patch('/api/findings/:id', async ({ params, request }) => {
    const body = (await request.json()) as { verification: string; user_note?: string }
    for (const c of Object.values(db.comparisons)) {
      for (const r of c.results) {
        const f = r.findings.find((x) => x.id === params.id)
        if (f) {
          f.history.push({ at: new Date().toISOString(), from: f.verification, to: body.verification as typeof f.verification, note: body.user_note ?? null })
          f.verification = body.verification as typeof f.verification
          f.user_note = body.user_note ?? f.user_note
          return HttpResponse.json(f)
        }
      }
    }
    return err(404, 'NOT_FOUND', '지적 항목을 찾을 수 없어요')
  }),

  http.post('/api/matches/:id/decision', async ({ params, request }) => {
    const body = (await request.json()) as DecisionBody
    const m = db.matches.find((x) => x.id === params.id)
    if (!m) return err(404, 'NOT_FOUND', '변화 카드를 찾을 수 없어요')
    m.status = body.action === 'keep' ? 'kept' : body.action === 'later' ? 'snoozed' : body.action === 'not_interested' ? 'dismissed' : m.status
    log({ change_id: m.change_id, action: body.action, summary: null, reason: body.reason ?? null })
    return new HttpResponse(null, { status: 204 })
  }),

  http.post('/api/switches', async ({ request }) => {
    const body = (await request.json()) as Partial<SwitchBody>
    if (body.confirmed !== true) return err(400, 'CONFIRMATION_REQUIRED', '사용자 확인 없이 교체할 수 없어요')
    const c = body.comparison_id ? db.comparisons[body.comparison_id] : undefined
    if (!c) return err(404, 'NOT_FOUND', '비교 기록을 찾을 수 없어요')
    await delay(800)
    const sw: Switch = {
      id: `sw_${Date.now()}`,
      comparison_id: c.id,
      changes: [{ kind: 'skill', target: '(더미) 리뷰 스킬', before: null, after: '0.1.0' }],
      applied_at: new Date().toISOString(),
      result: 'success',
      rolled_back: false,
    }
    switches.set(sw.id, sw)
    const m = db.matches.find((x) => x.id === c.match_id)
    if (m) m.status = 'switched'
    log({ change_id: changeIdOfMatch(c.match_id), action: 'switch', summary: null, reason: null })
    return HttpResponse.json(sw, { status: 201 })
  }),

  http.post('/api/switches/:id/rollback', async ({ params, request }) => {
    const body = (await request.json()) as RollbackBody
    const sw = switches.get(params.id as string)
    if (!sw) return err(404, 'NOT_FOUND', '교체 기록을 찾을 수 없어요')
    await delay(800)
    sw.rolled_back = true
    const c = db.comparisons[sw.comparison_id]
    const m = db.matches.find((x) => x.id === c?.match_id)
    if (m) m.status = 'rolled_back'
    log({ change_id: m?.change_id ?? '', action: 'rolled_back', summary: null, reason: body.reason })
    return HttpResponse.json(sw)
  }),

  http.get('/api/history', () => HttpResponse.json(db.history)),
]
