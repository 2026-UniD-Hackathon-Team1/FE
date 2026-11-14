// 백엔드 설계서 12장 API를 흉내 내는 목 서버. 응답 모양은 src/api/backend/types.ts와 같다.
// [요청] 표시된 경로는 설계서에 없어서 FE가 제안한 것이다 (docs/backend-api-requests.md).
import { delay, http, HttpResponse } from 'msw'
import {
  applies,
  candidate,
  comparisons,
  db,
  history,
  inputs,
  logEvent,
  recommendation,
  seedProfile,
  setMatchStatus,
  startedAt,
  state,
  suggestions,
  withProgress,
} from './backendDb'
import type * as B from '../api/backend/types'

/*
 * 개발용 상태 전환 (브라우저 콘솔에서 localStorage.setItem(...) 후 새로고침)
 *   mock:fresh  = '1'    → 처음 쓰는 사용자 (프로필·환경 없음 → 온보딩)
 *   mock:server = 'down' → 로컬 서버 꺼짐
 *   mock:empty  = '1'    → 추천 없음 (홈 빈 상태)
 *   mock:perm   = '1'    → 폴더 읽기 권한 없음
 */
const flag = (k: string) => (typeof localStorage === 'undefined' ? null : localStorage.getItem(k))
if (flag('mock:fresh') !== '1') seedProfile()

const err = (status: number, code: string, message: string) =>
  HttpResponse.json({ error: { code, message } } satisfies B.BError, {
    status,
  })
const now = () => new Date().toISOString()
const changeIdOfRec = (recId: string) => db.matches.find((m) => m.id === recId)?.change_id ?? ''
/** 목: 연결 프로그램 연결 상태 */
const agent = { paired: flag('mock:fresh') !== '1', pairedAt: null as number | null }
const previews = new Map<string, { comparison_id: string; token: string }>()
let rescans = 0

export const handlers = [
  // ── 연결 프로그램 [요청] docs/agent-design.md ──
  // mock:server='down' → 꺼짐, mock:fresh='1' → 아직 연결 안 함 (연결 코드를 받고 4초 뒤 연결됨)
  http.get('/api/agent', () => {
    const base = { device_name: 'MacBook-Pro', agent_version: '0.1.0', codex_version: '0.48.0', codex_ready: true }
    if (flag('mock:server') === 'down') return HttpResponse.json({ ...base, status: 'disconnected', last_seen_at: db.at(0, 13, 40) } satisfies B.BAgent)
    if (agent.paired === false && (agent.pairedAt === null || Date.now() < agent.pairedAt))
      return HttpResponse.json({
        status: 'never_connected',
        device_name: null,
        agent_version: null,
        codex_version: null,
        codex_ready: false,
        last_seen_at: null,
      } satisfies B.BAgent)
    return HttpResponse.json({ ...base, status: 'connected', last_seen_at: now() } satisfies B.BAgent)
  }),
  http.post('/api/agent/pairing-code', async () => {
    await delay(400)
    agent.pairedAt = Date.now() + 4000
    return HttpResponse.json({
      code: '4F7K-92QD',
      expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
      command: 'galtalka connect 4F7K-92QD',
      install_command: 'uv tool install galtalka',
    } satisfies B.BPairingCode)
  }),
  http.delete('/api/agent', () => {
    agent.paired = false
    agent.pairedAt = null
    return new HttpResponse(null, { status: 204 })
  }),

  // ── F01 프로필 ──
  http.get('/api/profile', () => (state.profile ? HttpResponse.json(state.profile) : err(404, 'NOT_FOUND', '프로필이 없어요'))), // [요청]
  http.put('/api/profile', async ({ request }) => {
    const b = (await request.json()) as B.BProfileInput
    const version = (state.profile?.profile_version ?? 0) + 1
    state.profile = {
      ...b,
      profile_id: 'local',
      profile_version: version,
      updated_at: now(),
    }
    return HttpResponse.json({
      profile_id: 'local',
      profile_version: version,
      recommendations_stale: true,
    } satisfies B.BProfileSaved)
  }),

  // ── F01 환경 ──
  http.get('/api/environment', async () => {
    await delay(250)
    if (flag('mock:perm') === '1') return err(403, 'OUTSIDE_ALLOWED_ROOT', '이 폴더를 읽을 권한이 없어요')
    return state.environment ? HttpResponse.json(state.environment) : err(404, 'NOT_FOUND', '아직 환경을 스캔하지 않았어요')
  }), // [요청]
  http.post('/api/environment/scan', async ({ request }) => {
    const b = (await request.json()) as B.BScanInput
    await delay(800)
    if (!b.root) return err(422, 'INVALID_INPUT_PATH', '스캔할 폴더를 정해 주세요')
    const before = state.environment
    if (!before) {
      const keep = state.profile
      seedProfile()
      state.profile = keep
    }
    const env = state.environment!
    // 같은 폴더를 두 번째로 다시 확인하면 바뀐 환경을 흉내 낸다 (FR-03 차이 표시)
    if (before && before.scan_root === b.root && rescans++ === 1) {
      env.runner_version = '0.49.0'
      env.installed_skills = env.installed_skills.map((s) => (s.name === 'lint-fix' ? { ...s, version: '1.9.0' } : s))
      env.installed_skills.push({
        name: 'doc-gen',
        version: '1.0.0',
        source: '공식 저장소',
        path: '.agents/skills/doc-gen',
      })
    }
    state.environment = {
      ...env,
      installed_skills: [...env.installed_skills],
      scan_root: b.root,
      allowed_scopes: b.scopes ?? env.allowed_scopes,
      scanned_at: now(),
    }
    return HttpResponse.json(state.environment)
  }),
  http.delete('/api/environment', async () => {
    await delay(400)
    state.environment = null
    return new HttpResponse(null, { status: 204 })
  }), // [요청]
  http.post('/api/environment/items', async ({ request }) => {
    const b = (await request.json()) as B.BEnvItemInput
    const e = state.environment
    if (!e) return err(404, 'NOT_FOUND', '아직 환경을 스캔하지 않았어요')
    if (b.kind === 'skill')
      e.installed_skills.push({
        name: b.name,
        version: b.version,
        source: b.source ?? '직접 입력',
        path: `.agents/skills/${b.name}`,
        excluded: b.excluded,
      })
    else if (b.kind === 'model') e.model_id = b.version ?? b.name
    else if (b.kind === 'runner') e.runner_version = b.version
    else
      (e.settings_files ??= []).push({
        path: b.name,
        summary: b.source ?? '직접 입력',
        readable: true,
        excluded: b.excluded,
      })
    return HttpResponse.json(e)
  }), // [요청]
  http.patch('/api/environment/items/:name', async ({ params, request }) => {
    const name = decodeURIComponent(params.name as string)
    const b = (await request.json()) as B.BEnvItemInput
    const e = state.environment
    if (!e) return err(404, 'NOT_FOUND', '아직 환경을 스캔하지 않았어요')
    const si = e.installed_skills.findIndex((s) => s.name === name)
    const files = e.settings_files ?? []
    const fi = files.findIndex((f) => f.path === name)
    if (b.kind === 'runner') e.runner_version = b.version
    else if (b.kind === 'model') e.model_id = b.version
    else if (si >= 0)
      e.installed_skills[si] = {
        ...e.installed_skills[si],
        name: b.name,
        version: b.version,
        source: b.source,
        excluded: b.excluded,
      }
    else if (fi >= 0)
      files[fi] = {
        ...files[fi],
        path: b.name,
        summary: b.source ?? files[fi].summary,
        excluded: b.excluded,
      }
    else return err(404, 'NOT_FOUND', '환경 항목을 찾을 수 없어요')
    return HttpResponse.json(e)
  }), // [요청]

  // ── F02 작업 방식 ──
  http.get('/api/work-methods', () => HttpResponse.json(state.methods)), // [요청]
  http.post('/api/work-methods', async ({ request }) => {
    const b = (await request.json()) as B.BWorkMethodInput
    const prev = state.methods.find((m) => m.task_type === b.task_type && m.is_active)
    if (prev) prev.is_active = false
    const saved: B.BWorkMethod = {
      ...b,
      method_id: prev?.method_id ?? `wm_${b.task_type}`,
      version: (prev?.version ?? 0) + 1,
      is_active: true,
      created_at: now(),
    }
    state.methods.push(saved)
    return HttpResponse.json(
      {
        method_id: saved.method_id,
        version: saved.version,
        is_active: true,
      } satisfies B.BWorkMethodSaved,
      { status: 201 },
    )
  }),

  // ── F04·F05 추천·후보 ──
  http.get('/api/recommendations', async ({ request }) => {
    await delay(250)
    // 배포 서버와 같이 기본은 숨긴 추천 제외, include_hidden=true면 전부
    const hidden = new URL(request.url).searchParams.get('include_hidden') === 'true'
    if (flag('mock:empty') === '1' && !hidden) return HttpResponse.json({ items: [] } satisfies B.BRecommendationList)
    const items = db.matches.map((m) => recommendation(m.id)).filter((r): r is B.BRecommendation => !!r && (hidden || r.status !== 'dismissed'))
    return HttpResponse.json({ items } satisfies B.BRecommendationList)
  }),
  http.get('/api/candidates/:id', ({ params }) => {
    const c = candidate(params.id as string)
    return c ? HttpResponse.json(c) : err(404, 'NOT_FOUND', '후보를 찾을 수 없어요')
  }),
  http.patch('/api/recommendations/:id', async ({ params, request }) => {
    const b = (await request.json()) as B.BRecommendationPatch
    const id = params.id as string
    setMatchStatus(id, b.status, b.status === 'snoozed' ? db.at(7, 9, 0) : null)
    if (b.status === 'snoozed')
      logEvent('recommendation_snoozed', changeIdOfRec(id), {
        summary: '7일 뒤에 다시 보여 드려요',
        reason: b.reason ?? null,
      })
    if (b.status === 'dismissed')
      logEvent('recommendation_dismissed', changeIdOfRec(id), {
        summary: '숨긴 변화 목록으로 옮겼어요',
        reason: b.reason ?? null,
      })
    return new HttpResponse(null, { status: 204 })
  }), // [요청]

  // ── F06 입력 ──
  http.get('/api/inputs/suggestions', () => HttpResponse.json(suggestions())), // [요청]
  http.post('/api/inputs', async ({ request }) => {
    const b = (await request.json()) as B.BInputCreate
    if (!b.relative_paths.length) return err(422, 'INVALID_INPUT_PATH', '비교할 파일을 하나 이상 골라 주세요')
    const id = `input_${Date.now()}_${inputs.size}`
    inputs.set(id, {
      label: b.relative_paths.length > 1 ? `${b.relative_paths[0]} 외 ${b.relative_paths.length - 1}개` : b.relative_paths[0],
      paths: b.relative_paths,
    })
    return HttpResponse.json({ input_id: id, manifest_sha256: id.slice(-8) } satisfies B.BInputCreated, { status: 201 })
  }),

  // ── F07 비교 ──
  http.get('/api/comparisons', () =>
    HttpResponse.json(
      [...startedAt.keys()].flatMap((id) => {
        const c = comparisons.get(id)
        return c
          ? [
              {
                comparison_id: id,
                change_title: c.change_title ?? '',
                candidate_label: c.candidate_label,
                status: withProgress(c).status,
                created_at: c.created_at ?? now(),
              } satisfies B.BComparisonSummary,
            ]
          : []
      }),
    ),
  ), // [요청] ?active=true
  http.post('/api/comparisons', async ({ request }) => {
    const b = (await request.json()) as B.BComparisonCreate
    const base = [...comparisons.values()].find((c) => c.candidate_version_id === b.candidate_version_id && c.status === 'done') ?? comparisons.get('cmp_a')!
    const id = `cmp_${Date.now()}`
    const chosen = b.input_ids.map((i) => inputs.get(i))
    comparisons.set(id, {
      ...base,
      comparison_id: id,
      recommendation_id: db.matches.find((m) => m.change_id === b.candidate_version_id)?.id ?? base.recommendation_id,
      candidate_version_id: b.candidate_version_id,
      is_prerecorded: false,
      created_at: now(),
      completed_at: now(),
      inputs: base.inputs.slice(0, Math.max(chosen.length, 1)).map((inp, i) => ({ ...inp, label: chosen[i]?.label ?? inp.label })),
    })
    startedAt.set(id, Date.now())
    logEvent('comparison_completed', b.candidate_version_id, {
      comparison_id: id,
      summary: `작업 ${b.input_ids.length}건 · 각 방식 1회 실행`,
    })
    return HttpResponse.json({ comparison_id: id, status: 'queued' } satisfies B.BComparisonCreated, { status: 202 })
  }),
  http.get('/api/comparisons/:id', async ({ params }) => {
    await delay(200)
    const c = comparisons.get(params.id as string)
    if (!c) return err(404, 'NOT_FOUND', '비교 기록을 찾을 수 없어요')
    const p = withProgress(c)
    // 끝난 결과를 열어 봤으면 홈의 "진행 중인 비교"에서 뺀다
    if (p.status === 'done') startedAt.delete(c.comparison_id)
    return HttpResponse.json(p)
  }),
  http.post('/api/comparisons/:id/cancel', ({ params }) => {
    const c = comparisons.get(params.id as string)
    if (!c) return err(404, 'NOT_FOUND', '비교 기록을 찾을 수 없어요')
    const p = withProgress(c)
    if (p.status === 'done') return err(409, 'ALREADY_DONE', '이미 끝난 비교예요')
    comparisons.set(c.comparison_id, {
      ...p,
      status: 'cancelled',
      verdict: 'abstain',
      verdict_reason: '사용자가 실행을 멈췄어요.',
    })
    startedAt.delete(c.comparison_id)
    return HttpResponse.json({
      comparison_id: c.comparison_id,
      status: 'cancelled',
    } satisfies B.BComparisonCreated)
  }),
  http.post('/api/comparisons/:id/rerun', ({ params }) => {
    const c = comparisons.get(params.id as string)
    if (!c) return err(404, 'NOT_FOUND', '비교 기록을 찾을 수 없어요')
    const base = comparisons.get('cmp_a')!
    const id = `cmp_${Date.now()}`
    comparisons.set(id, {
      ...base,
      comparison_id: id,
      recommendation_id: c.recommendation_id,
      candidate_version_id: c.candidate_version_id,
      is_prerecorded: false,
      created_at: now(),
    })
    startedAt.set(id, Date.now())
    return HttpResponse.json({ comparison_id: id, status: 'queued' } satisfies B.BComparisonCreated, { status: 202 })
  }), // [요청]
  // 배포 서버와 같이 PATCH { choice, reason }. 후보 선택(candidate)은 기록만 하고 적용은 따로 한다
  http.patch('/api/comparisons/:id/decision', async ({ params, request }) => {
    const b = (await request.json()) as B.BDecision
    const c = comparisons.get(params.id as string)
    if (!c) return err(404, 'NOT_FOUND', '비교 기록을 찾을 수 없어요')
    if (b.choice === 'candidate') return HttpResponse.json({ comparison_id: c.comparison_id, choice: b.choice })
    if (b.choice === 'baseline' && c.recommendation_id) setMatchStatus(c.recommendation_id, 'kept')
    logEvent(b.choice === 'baseline' ? 'decision_keep' : 'decision_more_comparison', c.candidate_version_id, {
      comparison_id: c.comparison_id,
      summary: b.choice === 'baseline' ? '기존 방식을 그대로 써요' : '다른 작업으로 더 비교해 볼게요',
      reason: b.reason || null,
    })
    return HttpResponse.json({ comparison_id: c.comparison_id, choice: b.choice })
  }),

  // ── F08 검증 ──
  http.patch('/api/findings/:id', async ({ params, request }) => {
    const b = (await request.json()) as B.BFindingPatch
    for (const c of comparisons.values()) {
      const f = c.findings?.find((x) => x.finding_id === params.id)
      if (!f || !c.findings) continue
      // 두 방식이 같은 문제를 지적했으면 묶음 전체를 같이 바꾼다 (FR-25)
      for (const g of c.findings.filter((x) => (f.canonical_group ? x.canonical_group === f.canonical_group : x.finding_id === f.finding_id))) {
        g.history.push({
          at: now(),
          from: g.verification,
          to: b.verification,
          note: b.evidence?.note ?? null,
        })
        g.verification = b.verification
        g.user_note = b.evidence?.note ?? g.user_note
      }
      return HttpResponse.json(f)
    }
    return err(404, 'NOT_FOUND', '지적 항목을 찾을 수 없어요')
  }),

  // ── F09·F10 적용·복원 ──
  http.post('/api/apply/preview', async ({ request }) => {
    const { comparison_id } = (await request.json()) as {
      comparison_id: string
    }
    const c = comparisons.get(comparison_id)
    if (!c) return err(404, 'NOT_FOUND', '비교 기록을 찾을 수 없어요')
    const cand = candidate(c.candidate_version_id)
    const name = cand?.asset?.display_name ?? cand?.title ?? 'skill'
    const preview_id = `preview_${Date.now()}`
    const token = `sha_${preview_id}`
    previews.set(preview_id, { comparison_id, token })
    return HttpResponse.json({
      preview_id,
      target_path: `.agents/skills/${name}`,
      changes: [
        {
          path: `.agents/skills/${name}/SKILL.md`,
          action: 'add',
          note: '비교에 쓴 버전 그대로',
        },
        { path: '.codex/config.toml', action: 'replace', note: '2줄 추가' },
        {
          path: '리뷰 프롬프트.md',
          action: 'replace',
          note: '지우지 않고 그대로 둬요',
        },
      ],
      additional_permissions: cand?.permissions.declared.filter((p) => p.additional) ?? [],
      candidate_version_id: c.candidate_version_id,
      current_state_sha256: 'cur_123',
      change_set_sha256: token,
      requires_confirmation: true,
      candidate_label: c.candidate_label,
      environment_changes:
        comparison_id === 'cmp_d'
          ? [
              { label: 'Codex CLI', before: '0.48.0', after: '0.49.0' },
              { label: 'lint-fix 스킬', before: '1.8.0', after: '1.9.0' },
            ]
          : [],
      manual_steps:
        cand?.support_level === 'applicable'
          ? null
          : [
              {
                title: '스킬 폴더 복사',
                command: `git clone --depth 1 ${cand?.source_url} && cp -r ${name}/skill .agents/skills/${name}`,
              },
              {
                title: '프롬프트 대신 스킬을 쓰도록 설정',
                command: `.codex/config.toml → [review] skill = "${name}"`,
              },
            ],
    } satisfies B.BApplyPreview)
  }),
  http.post('/api/apply', async ({ request }) => {
    const b = (await request.json()) as B.BApplyInput
    const p = previews.get(b.preview_id)
    if (!p) return err(404, 'NOT_FOUND', '미리보기가 만료됐어요. 다시 열어 주세요')
    if (p.token !== b.change_set_sha256) return err(409, 'ENVIRONMENT_CHANGED', '미리보기 이후 환경이 바뀌었어요')
    await delay(1200)
    const c = comparisons.get(p.comparison_id)!
    const apply_id = `apply_${Date.now()}`
    // cmp_e로 바꾸면 실패 → 자동 복원 흐름을 볼 수 있다 (FR-31)
    if (c.comparison_id === 'cmp_e')
      return HttpResponse.json(
        {
          apply_id,
          status: 'rolled_back',
          applied_at: null,
        } satisfies B.BApplyResult,
        { status: 202 },
      )
    applies.set(apply_id, {
      comparison_id: c.comparison_id,
      title: `${c.candidate_label} 교체`,
      created_at: now(),
      status: 'applied',
      conflict: false,
    })
    if (c.recommendation_id) setMatchStatus(c.recommendation_id, 'switched')
    logEvent('apply_completed', c.candidate_version_id, {
      comparison_id: c.comparison_id,
      apply_id,
      summary: `${c.baseline_label} → ${c.candidate_label}`,
    })
    return HttpResponse.json(
      {
        apply_id,
        status: 'applied',
        applied_at: now(),
      } satisfies B.BApplyResult,
      { status: 202 },
    )
  }),
  http.post('/api/apply/:id/rollback', async ({ params, request }) => {
    const b = (await request.json()) as B.BRollbackInput
    const id = params.id as string
    const a = applies.get(id)
    if (!a) return err(404, 'NOT_FOUND', '적용 기록을 찾을 수 없어요')
    if (a.status === 'rolled_back') return err(409, 'ALREADY_ROLLED_BACK', '이미 되돌린 교체예요')
    if (a.conflict && !b.conflict_strategy)
      return HttpResponse.json({
        status: 'conflict',
        reason: '적용 이후 직접 바꾼 파일이 있어요',
        conflict_paths: ['.codex/config.toml'],
      } satisfies B.BRollbackResult)
    await delay(1000)
    a.status = 'rolled_back'
    const c = comparisons.get(a.comparison_id)
    if (c?.recommendation_id) setMatchStatus(c.recommendation_id, 'rolled_back')
    const reason = b.reason === 'worse_result' ? '결과가 나빠짐' : b.reason === 'inconvenient' ? '쓰기 불편함' : (b.reason ?? '기타')
    logEvent('rollback_completed', c?.candidate_version_id ?? '', {
      apply_id: id,
      summary: `${c?.candidate_label} → 이전 방식으로 복원 완료`,
      reason,
    })
    return HttpResponse.json({
      status: 'rolled_back',
    } satisfies B.BRollbackResult)
  }),

  // ── F11 이력·저장소 ──
  http.get('/api/history', () => HttpResponse.json({ items: history } satisfies B.BHistory)),
  http.get('/api/storage', () =>
    HttpResponse.json({
      comparison_count: comparisons.size,
      backups: [...applies.entries()].map(([apply_id, a]) => ({
        apply_id,
        title: a.title,
        created_at: a.created_at,
        applied: a.status === 'applied',
      })),
    } satisfies B.BStorage),
  ), // [요청]
  http.delete('/api/storage', async ({ request }) => {
    await delay(400)
    const kind = new URL(request.url).searchParams.get('kind')
    if (kind === 'backups') applies.clear()
    else for (const id of [...comparisons.keys()]) if (!startedAt.has(id)) comparisons.delete(id)
    return new HttpResponse(null, { status: 204 })
  }), // [요청]
]
