// S-03 변화 상세: 변경 요약, 내 환경과의 관계, 출처·권한·호환성 (FR-05, 14~16)
import { useParams } from 'react-router'
import { ArrowRightIcon, ArrowTopRightOnSquareIcon, ArrowsRightLeftIcon, InformationCircleIcon, LinkIcon } from '@heroicons/react/24/outline'
import { useAgent, useChange, useDecision } from '../api/queries'
import { PageHeader } from '../components/PageHeader'
import { ErrorState, Loading } from '../components/States'
import { Button, ButtonLink } from '../components/ui/Button'
import { buttonClass } from '../components/ui/buttonClass'
import { Card, InfoList } from '../components/ui/Card'
import { DetailRow } from '../components/ui/DetailRow'
import { ImpactTag, NatureTag, StatusPill, Tag } from '../components/ui/Tag'
import { toast } from '../components/ui/toastStore'
import { SafetyInfo } from '../features/comparison/SafetyInfo'
import { safetySummary } from '../features/comparison/model'
import { changeTypeLabel, formatDate, formatWhen, taskTypeLabel, verdictLabel } from '../lib/labels'

const sourceKindLabel = {
  official_changelog: '공식 변경 기록',
  registry: '공식 스킬 저장소',
  package_registry: '패키지 저장소',
  manual_verified: '팀이 확인한 기록',
} as const

export function ChangeDetailPage() {
  const { changeId = '' } = useParams()
  const q = useChange(changeId)
  const agent = useAgent()
  const decide = useDecision(q.data?.match.id ?? '', q.data?.latest_comparison?.id)

  if (q.isPending) return <Loading />
  if (q.isError) return <ErrorState message={q.error.message} onRetry={() => void q.refetch()} />

  const { change, match, candidates, latest_comparison: last } = q.data
  const candidate = candidates.find((c) => c.status === 'active')
  const comparable = candidate && candidate.support_level !== 'info_only'
  const disconnected = agent.data?.status === 'disconnected'
  const currentName = change.replaces[0] ?? '내 기존 방식'
  // "pr-review 2.1.0" 같은 이름이 없으면 경로의 마지막 이름(…/skills/code-review → code-review)을 쓴다. 커밋 해시는 보여 주지 않는다
  const candidateName = change.title.match(/[a-z][a-z-]+ [\d.]+/)?.[0] ?? change.title.split('/').pop()?.trim() ?? '후보'

  return (
    <>
      <PageHeader
        crumbs={[{ label: '홈', to: '/' }, { label: '변화 상세' }]}
        title={
          <span className="grid gap-3">
            <span className="flex flex-wrap items-center gap-2 text-body">
              <NatureTag nature={match.nature} />
              <ImpactTag impact={match.impact} />
              <StatusPill>{last ? '비교 완료' : comparable ? '비교 전 · 비교해 볼 후보' : '정보만 · 비교할 수 없는 후보'}</StatusPill>
            </span>
            {change.title}
          </span>
        }
        description={`공개 ${formatDate(change.published_at)} · 갈아탈까 확인 ${formatDate(change.verified_at)}`}
        actions={
          <span className="flex items-center gap-1 rounded-xl border border-black/30 bg-white py-2.5 pr-2.5 pl-[18px]">
            {!comparable && <span className="mr-1 text-aux font-bold">이 변화, 어떻게 할까요?</span>}
            <Button variant="ghost" onClick={() => decide.mutate({ action: 'later' }, { onSuccess: () => toast('7일 뒤에 다시 보여 드릴게요') })}>
              나중에
            </Button>
            <Button variant="ghost" onClick={() => decide.mutate({ action: 'not_interested' }, { onSuccess: () => toast('숨긴 변화 목록으로 옮겼어요') })}>
              관심 없음
            </Button>
            {comparable ? (
              <ButtonLink
                variant="primary"
                icon={ArrowsRightLeftIcon}
                to={candidate ? `/comparisons/new?candidate=${candidate.id}&match=${match.id}` : '#'}
                disabled={disconnected}
              >
                내 작업으로 비교하기
              </ButtonLink>
            ) : (
              // 비교할 수 없는 후보 (Figma 39:1861): 출처에서 직접 보도록 안내
              <a href={change.sources[0]?.url} target="_blank" rel="noreferrer" className={buttonClass('secondary')}>
                <ArrowTopRightOnSquareIcon aria-hidden className="size-[18px]" />
                출처에서 보기
              </a>
            )}
          </span>
        }
      />

      <div className="grid gap-4">
        {!comparable && (
          <div className="glass-sub flex items-start gap-3 px-5 py-4">
            <InformationCircleIcon aria-hidden className="mt-0.5 size-6 shrink-0" />
            <div>
              <p className="font-bold">이 변화는 읽어 보기만 할 수 있어요</p>
              <p className="text-aux text-ink-sub">
                갈아탈까가 아직 이 스킬을 내 작업으로 실행해 보는 방법을 준비하지 못했어요. 그래서 비교하거나 바꿀 수는 없고, 무엇이 바뀌었는지와 출처만 보여 드려요. 직접 써 보고 싶다면 출처 링크에서 설치 방법을 확인해 주세요.
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Card title={<h2 className="text-title2">무엇이 달라졌나요</h2>}>
            <p className="mb-5">{change.summary}</p>
            <InfoList
              items={[
                ['변화 유형', changeTypeLabel[change.change_type]],
                ['대상', `${change.target_tool} ${change.target_versions.replace('>=', '').trim()} 이상`],
                ['관련 작업', change.task_types.map((t) => taskTypeLabel[t]).join(', ')],
                [
                  '출처',
                  change.sources.map((s) => (
                    <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline underline-offset-2">
                      {sourceKindLabel[s.kind]}
                      <ArrowTopRightOnSquareIcon aria-hidden className="size-3.5" />
                    </a>
                  )),
                ],
              ]}
            />
          </Card>
          <Card title={<h2 className="text-title2">내 환경과의 관계</h2>}>
            <div className="note mb-4 flex gap-3 p-4">
              <LinkIcon aria-hidden className="size-[22px] shrink-0" />
              <p className="font-bold">{match.reason}</p>
            </div>
            <div className="flex items-stretch gap-4">
              <div className="glass grid min-w-0 flex-1 content-start gap-2 p-4">
                <p className="text-aux text-ink-sub">지금 방식</p>
                <p className="font-bold break-words">{currentName}</p>
              </div>
              <ArrowRightIcon aria-hidden className="size-6 shrink-0 self-center" />
              <div className="glass grid min-w-0 flex-1 content-start gap-2 p-4">
                <p className="text-aux text-ink-sub">{comparable ? '비교해 볼 후보' : '새로 나온 방식'}</p>
                <p className="font-bold break-words">{candidateName}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card title={<h2 className="text-title2">제공자가 말하는 효과</h2>} aside={<Tag tone="outline">확인 전</Tag>}>
            {change.claimed_benefit ? (
              <>
                <p>"{change.claimed_benefit}"</p>
                <p className="mt-2 text-aux text-ink-sub">제공자의 설명을 그대로 옮긴 것이에요. 갈아탈까가 확인한 내용이 아니에요.</p>
              </>
            ) : (
              <p className="text-ink-sub">제공자가 밝힌 효과가 없어요.</p>
            )}
          </Card>
          <Card title={<h2 className="text-title2">갈아탈까에서 확인한 결과</h2>} aside={<Tag tone="outline">{last ? '각 방식 1회 실행 결과' : '아직 없음'}</Tag>}>
            {last ? (
              <>
                <p className="font-bold">{verdictLabel[last.verdict]}</p>
                <p className="mt-1 text-aux text-ink-sub">
                  {formatWhen(last.executed_at)} 실행 · {last.highlights.join(' · ')}
                </p>
                <ButtonLink to={`/comparisons/${last.id}`} size="sm" className="mt-3">
                  결과 보기
                </ButtonLink>
              </>
            ) : comparable ? (
              <>
                <p>아직 내 작업으로 비교해 보지 않았어요.</p>
                <p className="mt-1 text-aux text-ink-sub">비교를 실행하면 실제 실행 결과가 여기에 표시돼요.</p>
              </>
            ) : (
              <>
                <p>이 후보는 비교를 지원하지 않아서 실행 결과가 없어요.</p>
                <p className="mt-1 text-aux text-ink-sub">지원되면 홈 카드에서 "비교해 볼 후보"로 바뀌어 알려 드려요.</p>
              </>
            )}
          </Card>
        </div>

        {candidate && comparable && (
          <DetailRow title="실행 전 확인" summary={safetySummary(candidate)}>
            <SafetyInfo candidate={candidate} />
          </DetailRow>
        )}
      </div>
    </>
  )
}
