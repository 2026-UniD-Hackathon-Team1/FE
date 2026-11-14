// S-08 설정 (FR-04, 13): 환경 수정, 연결 해제, 데이터 관리
import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowPathIcon, CircleStackIcon, ExclamationTriangleIcon, LinkSlashIcon, PencilSquareIcon } from '@heroicons/react/24/outline'
import { useDeleteData, useDisconnect, useEnvironment, useProject, useWorkMethods } from '../api/queries'
import { PageHeader } from '../components/PageHeader'
import { ErrorState, Loading } from '../components/States'
import { Button } from '../components/ui/Button'
import { buttonClass } from '../components/ui/buttonClass'
import { Card, InfoList } from '../components/ui/Card'
import { DetailRow } from '../components/ui/DetailRow'
import { Modal } from '../components/ui/Modal'
import { Tag } from '../components/ui/Tag'
import { toast } from '../components/ui/toastStore'
import { RecheckModal } from '../features/environment/RecheckModal'
import { formatWhen, taskTypeLabel } from '../lib/labels'

export function SettingsPage() {
  const env = useEnvironment()
  const wm = useWorkMethods()
  const project = useProject()
  const disconnect = useDisconnect()
  const del = useDeleteData()
  const [modal, setModal] = useState<'recheck' | 'disconnect' | 'backups' | null>(null)

  if (project.isPending) return <Loading />
  if (project.isError) return <ErrorState message={project.error.message} onRetry={() => void project.refetch()} />

  const p = project.data
  const applied = p.backups.filter((b) => b.applied)
  const must = wm.data?.[0]?.required_conditions ?? []

  return (
    <>
      <PageHeader title="설정" description="환경, 프로젝트 연결, 데이터를 관리해요." />
      <div className="grid gap-4">
        <Card
          title="내 환경"
          aside={
            <>
              <Button size="sm" icon={ArrowPathIcon} onClick={() => setModal('recheck')}>환경 다시 확인</Button>
              <Link to="/onboarding?step=2" className={buttonClass('secondary', 'sm')}>
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
                  ['모델', env.data.model.version ? `${env.data.model.name} ${env.data.model.version}` : <Tag key="m" tone="outline">미확인</Tag>],
                  ['스킬', env.data.skills.map((s) => `${s.name} ${s.version ?? '미확인'}`).join(', ')],
                ]}
              />
              <InfoList
                items={[
                  ['주 작업', (wm.data ?? []).map((w) => taskTypeLabel[w.task_type]).join(', ') || '—'],
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
                  {p.work_dir} · {p.access_scope.join('와 ')} 허용
                </p>
              </div>
              <Button size="sm">접근 범위 바꾸기</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-4">
              <div className="flex-1">
                <p className="font-bold">연결 해제</p>
                <p className="text-aux text-ink-sub">이 프로젝트의 읽기, 실행, 쓰기 접근을 멈춰요. 지금 적용된 스킬은 그대로 남아요.</p>
              </div>
              <Button size="sm" icon={LinkSlashIcon} onClick={() => setModal('disconnect')} disabled={p.connection === 'disconnected'}>
                {p.connection === 'disconnected' ? '연결 해제됨' : '연결 해제'}
              </Button>
            </div>
          </div>
        </Card>

        <DetailRow title="데이터 관리" icon={<CircleStackIcon aria-hidden className="size-5" />} summary="비교 기록, 결과물, 백업 관리와 삭제" modalWidth={720}>
          <ul className="rows">
            <li className="flex items-center gap-3 py-4">
              <div className="flex-1">
                <p className="font-bold">비교 기록 {p.comparison_count}건</p>
                <p className="text-aux text-ink-sub">입력, 조건, 결과 원문, 검증 의견</p>
              </div>
              <Button size="sm" onClick={() => del.mutate('comparisons', { onSuccess: () => toast('비교 기록을 지웠어요') })}>
                삭제
              </Button>
            </li>
            <li className="flex items-center gap-3 py-4">
              <div className="flex-1">
                <p className="font-bold">백업 {p.backups.length}개</p>
                <p className="text-aux text-ink-sub">
                  {applied.length ? `지우면 ${applied.map((b) => b.title).join(', ')}을(를) 되돌릴 수 없게 돼요.` : '지금 적용 중인 교체가 없어서 지워도 되돌리기에는 영향이 없어요.'}
                </p>
              </div>
              <Button size="sm" disabled={!p.backups.length} onClick={() => setModal('backups')}>
                백업 관리
              </Button>
            </li>
          </ul>
          <p className="mt-2 text-aux text-ink-sub">데이터를 지워도 지금 적용된 스킬은 되돌아가지 않아요. 되돌리기는 [이력]에서 따로 해요.</p>
        </DetailRow>

        <Card title="알림" aside={<Tag tone="outline">준비 중</Tag>}>
          <p className="text-aux text-ink-sub">알림 빈도와 최소 영향도 설정은 다음 버전에서 제공해요. 지금은 홈의 변화 카드로만 알려 드려요.</p>
        </Card>
      </div>

      <RecheckModal key={modal === 'recheck' ? 'r1' : 'r0'} open={modal === 'recheck'} onClose={() => setModal(null)} />

      <Modal
        open={modal === 'disconnect'}
        onClose={() => setModal(null)}
        title={`${p.name} 연결을 해제할까요?`}
        footer={
          <>
            <Button onClick={() => setModal(null)}>취소</Button>
            <Button variant="danger" disabled={disconnect.isPending} onClick={() => disconnect.mutate(undefined, { onSuccess: () => { setModal(null); toast('연결을 해제했어요') } })}>
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
            <li key={t} className="flex gap-3 rounded-[10px] border border-ink/12 px-3.5 py-3">
              <ExclamationTriangleIcon aria-hidden className="size-6 shrink-0" />
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
            <Button variant="danger" disabled={del.isPending} onClick={() => del.mutate('backups', { onSuccess: () => { setModal(null); toast('백업을 지웠어요') } })}>
              그래도 지우기
            </Button>
          </>
        }
      >
        <p className="mb-3 text-ink-sub">지우면 아래 교체를 더 이상 되돌릴 수 없어요.</p>
        <ul className="grid gap-2.5">
          {p.backups.map((b) => (
            <li key={b.switch_id} className={`flex gap-3 rounded-[10px] border border-ink/12 px-3.5 py-3 ${b.applied ? 'bg-bg-sub' : ''}`}>
              <ExclamationTriangleIcon aria-hidden className={`size-6 shrink-0 ${b.applied ? '' : 'opacity-30'}`} />
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
    </>
  )
}
