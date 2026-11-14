// S-08 설정 (FR-04, 13): 환경 수정, 연결 해제, 데이터 관리
import { useState } from 'react'
import { Link } from 'react-router'
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  InformationCircleIcon,
  PencilSquareIcon,
  TrashIcon,
  WrenchScrewdriverIcon,
  XCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { useDeleteData, useDisconnect, useEnvironment, useHiddenChanges, useProfile, useProject, useSaveWorkMethods, useWorkMethods } from '../api/queries'
import { PageHeader } from '../components/PageHeader'
import { ErrorState, Loading } from '../components/States'
import { Button } from '../components/ui/Button'
import { buttonClass } from '../components/ui/buttonClass'
import { Card, InfoList } from '../components/ui/Card'
import { DetailRow } from '../components/ui/DetailRow'
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

export function SettingsPage() {
  const env = useEnvironment()
  const wm = useWorkMethods()
  const project = useProject()
  const disconnect = useDisconnect()
  const del = useDeleteData()
  const [modal, setModal] = useState<'recheck' | 'disconnect' | 'backups' | 'scope' | 'methods' | 'hidden' | null>(null)
  const hidden = useHiddenChanges(true)

  if (project.isPending) return <Loading />
  if (project.isError) return <ErrorState message={project.error.message} onRetry={() => void project.refetch()} />

  const p = project.data
  const applied = p.backups.filter((b) => b.applied)
  const must = wm.data?.[0]?.required_conditions ?? []

  return (
    <div className="max-w-[920px]">
      <PageHeader title="설정" description="환경, 프로젝트 연결, 데이터를 관리해요." />
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

        <DetailRow title="데이터 관리" summary="비교 기록, 결과물, 백업 관리와 삭제" modalWidth={976}>
          {/* Figma 23:5743: 비교 기록 · 백업 · 숨긴 변화 세 줄 + 안내 상자 */}
          <ul className="rows">
            <li className="flex items-center gap-3 py-4">
              <div className="flex-1">
                <p className="font-bold">비교 기록과 결과물</p>
                <p className="text-aux text-ink-sub">비교 {p.comparison_count}건 · 코드 내용은 서버에 수집하지 않아요</p>
              </div>
              <Button
                size="sm"
                icon={TrashIcon}
                onClick={() =>
                  del.mutate('comparisons', {
                    onSuccess: () => toast('비교 기록을 지웠어요'),
                  })
                }
              >
                삭제
              </Button>
            </li>
            <li className="flex items-center gap-3 py-4">
              <div className="flex-1">
                <p className="font-bold">백업</p>
                <p className="text-aux text-ink-sub">
                  백업 {p.backups.length}개
                  {applied.length ? ` · 지우면 교체 ${applied.length}건(${applied.map((b) => b.title).join(', ')})을 되돌릴 수 없게 돼요` : ' · 지금 적용 중인 교체가 없어서 지워도 영향이 없어요'}
                </p>
              </div>
              <Button size="sm" icon={TrashIcon} disabled={!p.backups.length} onClick={() => setModal('backups')}>
                삭제
              </Button>
            </li>
            <li className="flex items-center gap-3 py-4">
              <div className="flex-1">
                <p className="font-bold">숨긴 변화</p>
                <p className="text-aux text-ink-sub">관심 없음으로 숨긴 변화 {hidden.data?.length ?? 0}건</p>
              </div>
              <Button size="sm" icon={EyeIcon} onClick={() => setModal('hidden')}>
                목록 보기
              </Button>
            </li>
          </ul>
          <p className="note mt-2 flex items-center gap-2.5 px-4 py-3 text-aux text-ink-sub">
            <InformationCircleIcon aria-hidden className="size-5 shrink-0" />
            데이터를 삭제해도 지금 적용된 스킬은 되돌아가지 않아요. 되돌리려면 먼저 [이력]에서 복원해 주세요.
          </p>
        </DetailRow>
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
            ['비교 기록과 백업은 지우지 않아요', '지우려면 [데이터 관리]에서 따로 지울 수 있어요'],
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

      <Modal
        open={modal === 'backups'}
        onClose={() => setModal(null)}
        title={`백업 ${p.backups.length}개를 지울까요?`}
        footer={
          <>
            <Button onClick={() => setModal(null)}>취소</Button>
            <Button
              variant="danger"
              disabled={del.isPending}
              onClick={() =>
                del.mutate('backups', {
                  onSuccess: () => {
                    setModal(null)
                    toast('백업을 지웠어요')
                  },
                })
              }
            >
              그래도 지우기
            </Button>
          </>
        }
      >
        <p className="mb-3 text-aux text-ink-sub">지우면 아래 교체를 더 이상 되돌릴 수 없어요.</p>
        <ul className="grid gap-2.5">
          {p.backups.map((b) => (
            <li key={b.switch_id} className="flex gap-3 rounded-lg border border-ink/12 bg-white px-3.5 py-3">
              {b.applied ? <XCircleIcon aria-hidden className="mt-0.5 size-5 shrink-0" /> : <CheckCircleIcon aria-hidden className="mt-0.5 size-5 shrink-0" />}
              <div>
                <p className="font-bold">
                  {b.title} ({formatWhen(b.taken_at)})
                </p>
                <p className="text-aux text-ink-sub">{b.applied ? '지금 적용 중 · 되돌리기 불가능해져요' : '이미 되돌린 교체라 영향 없어요'}</p>
              </div>
            </li>
          ))}
        </ul>
      </Modal>
    </div>
  )
}
