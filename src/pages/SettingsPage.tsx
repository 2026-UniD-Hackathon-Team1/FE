// S-08 설정 (FR-04, 13): 환경 수정, 연결 해제, 데이터 관리
import { useState } from 'react'
import { Link } from 'react-router'
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  PencilSquareIcon,
  WrenchScrewdriverIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import {
  useDevices,
  useDisconnect,
  useEnvironment,
  useHealth,
  useHiddenChanges,
  useProfile,
  useProject,
  useSaveWorkMethods,
  useSetPrimaryDevice,
  useWorkMethods,
} from '../api/queries'
import { PageHeader } from '../components/PageHeader'
import { ErrorState, Loading } from '../components/States'
import { Button } from '../components/ui/Button'
import { buttonClass } from '../components/ui/buttonClass'
import { Card, InfoList } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { Tag } from '../components/ui/Tag'
import { toast } from '../components/ui/toastStore'
import { HiddenModal } from '../features/changes/HiddenModal'
import { RecheckModal } from '../features/environment/RecheckModal'
import { WorkMethodEditor } from '../features/environment/WorkMethodEditor'
import { draftValid, fromDraft, toDraft, type MethodDraft } from '../features/environment/methodDraft'
import { ScopeModal } from '../features/project/ScopeModal'
import { accessScopeShort, formatWhen, taskTypeLabel } from '../lib/labels'
import type { WorkMethod } from '../types/domain'

function MethodsModal({ initial, skills, onClose }: { initial: WorkMethod[]; skills: string[]; onClose: () => void }) {
  const save = useSaveWorkMethods()
  const profile = useProfile()
  const [draft, setDraft] = useState<MethodDraft>(() => toDraft(initial, profile.data?.task_types))
  return (
    <Modal
      open
      onClose={onClose}
      width={936}
      title="작업 방식 수정"
      footer={
        <>
          <Button onClick={onClose}>취소</Button>
          <Button
            variant="primary"
            disabled={!draftValid(draft) || save.isPending}
            onClick={() =>
              save.mutate(fromDraft(draft), {
                onSuccess: () => {
                  toast('작업 방식을 저장했어요. 이전 버전은 이력에 남아요')
                  onClose()
                },
              })
            }
          >
            {save.isPending ? '저장하는 중…' : '저장'}
          </Button>
        </>
      }
    >
      <p className="mb-5 text-ink-sub">여기 적은 방식이 다음 비교부터 기준(기존 방식)이 돼요. 바꾸면 버전이 올라가고, 이전 버전은 이력에 남아요.</p>
      <WorkMethodEditor compact draft={draft} onChange={setDraft} skills={skills} />
      {save.isError && (
        <p role="alert" className="mt-4 text-aux">
          저장하지 못했어요: {save.error.message}
        </p>
      )}
    </Modal>
  )
}

/** 연결된 PC 목록. 스캔·비교·적용은 기본 기기로 가서, 기본 기기가 꺼져 있으면 다른 PC로 바꿀 수 있게 한다 */
/** 서버(API·DB) 상태: GET /api/health */
function ServerHealth() {
  const h = useHealth()
  const ok = h.isSuccess
  return (
    <section className="glass flex flex-wrap items-center gap-3 px-6 py-[18px]" aria-labelledby="server">
      <h2 id="server" className="text-title2">
        서버
      </h2>
      <span className="flex min-w-0 flex-1 items-center gap-1.5 text-aux text-ink-sub">
        {h.isPending ? (
          '확인하는 중이에요'
        ) : ok ? (
          <>
            <CheckCircleIcon aria-hidden className="size-[18px] text-ink" />
            정상 · 데이터베이스 준비됨
          </>
        ) : (
          <>
            <ExclamationTriangleIcon aria-hidden className="size-[18px] text-ink" />
            <b className="text-ink">문제 있음</b> · {h.error?.message}
          </>
        )}
      </span>
      <Button size="sm" variant="ghost" icon={ArrowPathIcon} onClick={() => void h.refetch()} disabled={h.isFetching}>
        다시 확인
      </Button>
    </section>
  )
}

function Devices() {
  const devices = useDevices()
  const setPrimary = useSetPrimaryDevice()
  const list = devices.data ?? []
  if (list.length === 0) return null
  return (
    <div className="grid gap-2.5 py-4">
      <div>
        <p className="font-bold">연결된 기기</p>
        <p className="text-aux text-ink-sub">스캔, 비교, 바꾸기는 기본 기기에서 실행돼요. 기본 기기가 꺼져 있으면 다른 기기로 바꿔 주세요.</p>
      </div>
      <ul className="grid gap-2">
        {list.map((d) => {
          const on = d.status === 'connected'
          return (
            <li key={d.device_id} className="flex flex-wrap items-center gap-3 rounded-lg border border-ink/12 bg-white px-3.5 py-2.5">
              <span aria-hidden className={`size-2 rounded-full ${on ? 'bg-main' : 'bg-ink-sub'}`} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-aux font-bold">
                  {d.device_name ?? '이름 없는 기기'}
                  {d.is_primary && <Tag tone="outline">기본</Tag>}
                </p>
                <p className="text-caption text-ink-sub">
                  {on ? '연결됨' : '꺼져 있음'} · Codex CLI {d.codex_version ?? '미확인'}
                  {d.codex_ready ? '' : ' (로그인 필요)'} · {formatWhen(d.last_seen_at)} 확인
                </p>
              </div>
              {!d.is_primary && (
                <Button
                  size="sm"
                  disabled={setPrimary.isPending}
                  onClick={() => setPrimary.mutate(d.device_id, { onSuccess: () => toast(`${d.device_name ?? '이 기기'}를 기본 기기로 바꿨어요`) })}
                >
                  기본으로 쓰기
                </Button>
              )}
            </li>
          )
        })}
      </ul>
      {setPrimary.isError && (
        <p role="alert" className="text-aux">
          바꾸지 못했어요: {setPrimary.error.message}
        </p>
      )}
    </div>
  )
}

export function SettingsPage() {
  const env = useEnvironment()
  const wm = useWorkMethods()
  const project = useProject()
  const disconnect = useDisconnect()
  const [modal, setModal] = useState<'recheck' | 'disconnect' | 'scope' | 'methods' | 'hidden' | null>(null)
  const hidden = useHiddenChanges(true)

  if (project.isPending) return <Loading />
  if (project.isError) return <ErrorState message={project.error.message} onRetry={() => void project.refetch()} />

  const p = project.data
  const must = wm.data?.[0]?.required_conditions ?? []

  return (
    <div className="max-w-[920px]">
      <PageHeader title="설정" description="환경과 프로젝트 연결을 관리해요." />
      <div className="grid gap-4">
        <Card
          title="내 환경"
          aside={
            <>
              <Button size="sm" icon={ArrowPathIcon} onClick={() => setModal('recheck')}>
                환경 다시 확인
              </Button>
              <Link to="/onboarding?step=3&from=settings" className={buttonClass('secondary', 'sm')}>
                <PencilSquareIcon aria-hidden className="size-[18px]" />
                수정
              </Link>
            </>
          }
        >
          {env.data ? (
            <div className="grid gap-x-10 gap-y-2 md:grid-cols-2">
              <InfoList
                items={[
                  ['도구', `${env.data.tool.name} ${env.data.tool.version ?? '미확인'}`],
                  [
                    '모델',
                    env.data.model.version ? (
                      `${env.data.model.name} ${env.data.model.version}`
                    ) : (
                      <Tag key="m" tone="outline">
                        미확인
                      </Tag>
                    ),
                  ],
                  ['스킬', env.data.skills.map((s) => `${s.name} ${s.version ?? '미확인'}`).join(', ')],
                ]}
              />
              <InfoList
                items={[
                  [
                    '주 작업',
                    <span key="t" className="inline-flex flex-wrap items-center gap-2">
                      {(wm.data ?? []).map((w) => `${taskTypeLabel[w.task_type]} v${w.version}`).join(', ') || '—'}
                      <button type="button" onClick={() => setModal('methods')} className="inline-flex items-center gap-1 font-bold underline-offset-2 hover:underline">
                        <WrenchScrewdriverIcon aria-hidden className="size-4" />
                        작업 방식 수정
                      </button>
                    </span>,
                  ],
                  ['필수 조건', must.length > 1 ? `${must[0]} 외 ${must.length - 1}개` : (must[0] ?? '—')],
                  ['마지막 확인', formatWhen(env.data.last_checked_at)],
                ]}
              />
            </div>
          ) : (
            <p className="text-ink-sub">{env.isError ? '환경을 불러오지 못했어요' : '불러오는 중이에요'}</p>
          )}
        </Card>

        <Card title="프로젝트 연결">
          <div className="rows">
            <div className="flex flex-wrap items-center gap-3 pb-4">
              <div className="flex-1">
                <p className="font-bold">{p.name}</p>
                <p className="text-aux text-ink-sub">
                  {p.work_dir} · {p.access_scope.map((k) => accessScopeShort[k] ?? k).join(', ')} 허용
                </p>
              </div>
              <Button size="sm" onClick={() => setModal('scope')}>
                접근 범위 바꾸기
              </Button>
            </div>
            <Devices />
            <div className="flex flex-wrap items-center gap-3 pt-4">
              <div className="flex-1">
                <p className="font-bold">연결 해제</p>
                <p className="text-aux text-ink-sub">이 컴퓨터의 연결 프로그램 연결을 끊어요. 지금 적용된 스킬은 그대로 남아요.</p>
              </div>
              <Button size="sm" icon={XMarkIcon} onClick={() => setModal('disconnect')} disabled={p.connection === 'disconnected'}>
                {p.connection === 'disconnected' ? '연결 해제됨' : '연결 해제'}
              </Button>
            </div>
          </div>
        </Card>

        <ServerHealth />

        {/* 비교 기록·백업 삭제는 서버 API가 없어 뺐다. 숨긴 변화만 다시 볼 수 있게 남긴다 */}
        <div className="glass flex items-center gap-3 px-6 py-[18px]">
          <div className="flex-1">
            <p className="font-bold">숨긴 변화</p>
            <p className="text-aux text-ink-sub">관심 없음으로 숨긴 변화 {hidden.data?.length ?? 0}건</p>
          </div>
          <Button size="sm" icon={EyeIcon} onClick={() => setModal('hidden')}>
            목록 보기
          </Button>
        </div>
      </div>

      <ScopeModal open={modal === 'scope'} onClose={() => setModal(null)} />
      {modal === 'methods' && wm.data && <MethodsModal initial={wm.data} skills={env.data?.skills.map((s) => s.name) ?? []} onClose={() => setModal(null)} />}
      <RecheckModal key={modal === 'recheck' ? 'r1' : 'r0'} open={modal === 'recheck'} onClose={() => setModal(null)} />
      <HiddenModal open={modal === 'hidden'} onClose={() => setModal(null)} />

      <Modal
        open={modal === 'disconnect'}
        onClose={() => setModal(null)}
        title="이 컴퓨터의 연결을 해제할까요?"
        footer={
          <>
            <Button onClick={() => setModal(null)}>취소</Button>
            <Button
              variant="danger"
              disabled={disconnect.isPending}
              onClick={() =>
                disconnect.mutate(undefined, {
                  onSuccess: () => {
                    setModal(null)
                    toast('연결을 해제했어요')
                  },
                })
              }
            >
              연결 해제
            </Button>
          </>
        }
      >
        <ul className="grid gap-2.5">
          {[
            ['파일 읽기, 비교 실행, 바꾸기를 모두 멈춰요', null],
            ['지금 적용된 스킬은 그대로 남아요', '되돌리고 싶다면 먼저 [이력]에서 되돌려 주세요'],
            ['비교 기록과 이력은 지우지 않아요', null],
          ].map(([t, s]) => (
            <li key={t} className="flex gap-3 rounded-lg border border-ink/12 bg-white px-3.5 py-3">
              <ExclamationTriangleIcon aria-hidden className="mt-0.5 size-5 shrink-0" />
              <div>
                <p className="font-bold">{t}</p>
                {s && <p className="text-aux text-ink-sub">{s}</p>}
              </div>
            </li>
          ))}
        </ul>
      </Modal>

    </div>
  )
}
