// S-02 홈: 내 환경 요약, 우선순위 높은 변화 카드, 전체 변화 목록 (FR-03, 09~12)
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ArrowPathIcon, ChevronRightIcon, ClipboardDocumentIcon, EyeSlashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { useAgent, useChanges, useEnvironment, useHiddenChanges, useUnhide } from '../api/queries'
import { PageHeader } from '../components/PageHeader'
import { EmptyState, ErrorState, Loading } from '../components/States'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { ChoiceChip, ImpactTag, NatureTag, StatusPill } from '../components/ui/Tag'
import { toast } from '../components/ui/toastStore'
import { ChangeCard } from '../features/changes/ChangeCard'
import { ActiveComparisons } from '../features/comparison/ActiveComparisons'
import { RecheckModal } from '../features/environment/RecheckModal'
import { formatWhen } from '../lib/labels'
import type { MatchedChange } from '../types/api'
import type { Impact, TaskType } from '../types/domain'

/** D-07: 홈 상단 카드 최대 3개 */
const TOP_CARD_LIMIT = 3
const impactRank: Record<Impact, number> = { high: 0, medium: 1, low: 2 }

function statusText({ match, support_level }: MatchedChange): string {
  if (support_level === 'info_only') return '정보만'
  switch (match.status) {
    case 'snoozed': {
      const d = match.snoozed_until ? new Date(match.snoozed_until) : null
      return d ? `나중에 · ${d.getMonth() + 1}.${d.getDate()} 다시 표시` : '나중에'
    }
    case 'kept':
      return '기존 방식 유지'
    case 'switched':
      return '바꿈'
    case 'rolled_back':
      return '되돌림'
    case 'compared':
      return '비교 완료'
    default:
      return '비교 전'
  }
}

function HiddenModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const hidden = useHiddenChanges(open)
  const unhide = useUnhide()
  return (
    <Modal open={open} onClose={onClose} title={`숨긴 변화 ${hidden.data?.length ?? ''}건`} footer={<Button onClick={onClose}>닫기</Button>}>
      {hidden.isPending ? (
        <Loading />
      ) : (
        <ul className="rows">
          {hidden.data?.map(({ match, change }) => (
            <li key={match.id} className="flex items-center gap-3 py-3">
              <div className="flex-1">
                <p className="font-bold">{change.title}</p>
                <p className="text-aux text-ink-sub">{match.reason}</p>
              </div>
              <Button
                size="sm"
                disabled={unhide.isPending}
                onClick={() =>
                  unhide.mutate(match.id, {
                    onSuccess: () => void hidden.refetch().then(() => toast('다시 보이게 했어요')),
                  })
                }
              >
                다시 보기
              </Button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-aux text-ink-sub">같은 버전과 작업 유형 조합만 숨겨요. 새 버전이 나오면 다시 알려드려요.</p>
    </Modal>
  )
}

export function HomePage() {
  const env = useEnvironment()
  const changes = useChanges()
  const agent = useAgent()
  const [filter, setFilter] = useState<'all' | TaskType>('all')
  const [modal, setModal] = useState<'recheck' | 'hidden' | null>(null)
  const disconnected = agent.data?.status === 'disconnected'

  const top = useMemo(
    () =>
      (changes.data ?? [])
        .filter((c) => ['new', 'seen', 'compared'].includes(c.match.status) && c.support_level !== 'info_only')
        .sort((a, b) => impactRank[a.match.impact] - impactRank[b.match.impact])
        .slice(0, TOP_CARD_LIMIT),
    [changes.data],
  )
  const rest = (changes.data ?? []).filter((c) => !top.includes(c))
  const shown = rest.filter((c) => filter === 'all' || c.change.task_types.includes(filter))
  const count = (t: TaskType) => (changes.data ?? []).filter((c) => c.change.task_types.includes(t)).length

  return (
    <>
      <PageHeader
        title="홈"
        description="내 환경에 영향을 주는 변화만 골라서 보여 드려요."
        actions={
          <Button icon={ArrowPathIcon} onClick={() => setModal('recheck')} disabled={disconnected}>
            환경 다시 확인
          </Button>
        }
      />

      <div className="grid gap-6">
        {disconnected && (
          <div role="alert" className="glass-sub flex flex-wrap items-center gap-3 px-5 py-4">
            <ExclamationTriangleIcon aria-hidden className="size-6" />
            <div className="min-w-0 flex-1">
              <p className="font-bold">연결 프로그램이 꺼져 있어요</p>
              <p className="text-aux text-ink-sub">비교와 바꾸기를 하려면 터미널에서 다시 켜 주세요. 변화 목록과 이력은 그대로 볼 수 있어요.</p>
            </div>
            <Button
              size="sm"
              icon={ClipboardDocumentIcon}
              onClick={() => void navigator.clipboard?.writeText('galtalka run').then(() => toast('명령을 복사했어요'))}
            >
              명령 복사
            </Button>
          </div>
        )}

        <section className="glass-sub flex flex-wrap items-center gap-x-4 gap-y-1 px-6 py-4">
          <h2 className="text-title3">내 환경</h2>
          <p className="min-w-0 flex-1 text-aux text-ink-sub">
            {env.data
              ? `${env.data.tool.name} ${env.data.tool.version ?? '미확인'} · 스킬 ${env.data.skills.length}개 설치(${env.data.skills.filter((s) => s.excluded).length}개 비교 제외) · 코드 리뷰, 테스트 작성 · ${formatWhen(env.data.last_checked_at)} 확인`
              : env.isError
                ? '환경을 불러오지 못했어요'
                : '불러오는 중이에요'}
          </p>
          <Link to="/onboarding?step=3&from=home" className="inline-flex items-center gap-0.5 text-aux font-bold hover:underline">
            수정 <ChevronRightIcon aria-hidden className="size-4" />
          </Link>
        </section>

        <ActiveComparisons />

        {changes.isPending ? (
          <Loading text="변화를 불러오는 중이에요" />
        ) : changes.isError ? (
          <ErrorState message={changes.error.message} onRetry={() => void changes.refetch()} />
        ) : changes.data.length === 0 ? (
          <EmptyState
            title="지금은 내 환경에 영향을 주는 변화가 없어요"
            description={`마지막 확인 ${formatWhen(env.data?.last_checked_at)}`}
            action={
              <Button icon={ArrowPathIcon} onClick={() => setModal('recheck')}>
                환경 다시 확인
              </Button>
            }
          />
        ) : (
          <>
            <section>
              <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-title2">
                  먼저 확인할 변화 <span className="rounded-md bg-bg-sub px-2 text-aux font-bold">{top.length}건</span>
                </h2>
                <span className="text-aux text-ink-sub">영향도가 높은 순서로 최대 {TOP_CARD_LIMIT}건</span>
              </header>
              <div className="grid items-stretch gap-4 md:grid-cols-3">
                {top.map((c) => (
                  <ChangeCard key={c.match.id} item={c} canCompare={!disconnected} />
                ))}
              </div>
            </section>

            <Card
              padded={false}
              title={<h2 className="text-title2">전체 변화</h2>}
              aside={
                <div className="flex flex-wrap gap-2" role="group" aria-label="작업 유형으로 거르기">
                  <ChoiceChip selected={filter === 'all'} onClick={() => setFilter('all')}>
                    전체 {changes.data.length}
                  </ChoiceChip>
                  <ChoiceChip selected={filter === 'code_review'} onClick={() => setFilter('code_review')}>
                    코드 리뷰 {count('code_review')}
                  </ChoiceChip>
                  <ChoiceChip selected={filter === 'test_writing'} onClick={() => setFilter('test_writing')}>
                    테스트 작성 {count('test_writing')}
                  </ChoiceChip>
                  <ChoiceChip selected={false} onClick={() => setModal('hidden')}>
                    <EyeSlashIcon aria-hidden className="size-4" />
                    숨긴 변화
                  </ChoiceChip>
                </div>
              }
              className="[&>header]:px-6 [&>header]:pt-6"
            >
              <table className="w-full text-left">
                <thead className="text-caption text-ink-sub">
                  <tr className="border-b border-ink/12">
                    <th className="w-36 px-6 py-2.5 font-medium">성격</th>
                    <th className="w-32 py-2.5 font-medium">영향도</th>
                    <th className="py-2.5 font-medium">변화</th>
                    <th className="w-52 py-2.5 font-medium">상태</th>
                    <th className="w-12" />
                  </tr>
                </thead>
                <tbody className="rows">
                  {shown.map((c) => (
                    <tr key={c.match.id} className="group relative transition-colors duration-150 hover:bg-white/50">
                      <td className="px-6 py-3">
                        <NatureTag nature={c.match.nature} />
                      </td>
                      <td className="py-3">
                        <ImpactTag impact={c.match.impact} />
                      </td>
                      <td className="py-3">
                        <Link to={`/changes/${c.change.id}`} className="font-bold after:absolute after:inset-0">
                          {c.change.title}
                        </Link>
                        <p className="text-aux text-ink-sub">{c.match.reason}</p>
                      </td>
                      <td className="py-3">
                        <StatusPill>{statusText(c)}</StatusPill>
                      </td>
                      <td className="pr-6">
                        <ChevronRightIcon aria-hidden className="size-5 text-ink-sub group-hover:text-ink" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {shown.length === 0 && <p className="px-6 py-8 text-center text-aux text-ink-sub">이 작업 유형에 해당하는 다른 변화가 없어요.</p>}
            </Card>
          </>
        )}
      </div>

      <RecheckModal key={modal === 'recheck' ? 'r1' : 'r0'} open={modal === 'recheck'} onClose={() => setModal(null)} />
      <HiddenModal open={modal === 'hidden'} onClose={() => setModal(null)} />
    </>
  )
}
