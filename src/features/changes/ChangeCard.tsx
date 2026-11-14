// 6.2장 변화 카드: 요약 · 관련 이유 · 성격/영향도 · (비교 후) 판정 요약과 지표 · 나중에/관심 없음
import { Link } from 'react-router'
import { ArrowsRightLeftIcon, EyeIcon, LinkIcon, ScaleIcon } from '@heroicons/react/24/outline'
import { useDecision } from '../../api/queries'
import { ButtonLink } from '../../components/ui/Button'
import { ImpactTag, NatureTag, Tag } from '../../components/ui/Tag'
import { toast } from '../../components/ui/toastStore'
import { formatWhen, verdictLabel } from '../../lib/labels'
import type { MatchedChange } from '../../types/api'

export function ChangeCard({ item, canCompare }: { item: MatchedChange; canCompare: boolean }) {
  const { match, change, latest_comparison: last, candidate_id } = item
  const decide = useDecision(match.id)

  const later = () => decide.mutate({ action: 'later' }, { onSuccess: () => toast('7일 뒤에 다시 보여 드릴게요') })
  const hide = () => decide.mutate({ action: 'not_interested' }, { onSuccess: () => toast('숨긴 변화 목록으로 옮겼어요') })

  return (
    <article className="glass flex flex-col gap-3 p-6">
      <div className="flex flex-wrap items-center gap-2">
        <NatureTag nature={match.nature} />
        <ImpactTag impact={match.impact} />
      </div>
      <h3 className="text-title3">
        <Link to={`/changes/${change.id}`} className="hover:underline">
          {change.title}
        </Link>
      </h3>
      <p className="flex items-start gap-2">
        <LinkIcon aria-hidden className="mt-[3px] size-5 shrink-0 text-ink-sub" />
        {match.reason}
      </p>

      <div className="mt-auto grid gap-3 border-t border-ink/12 pt-4">
        {last ? (
          <>
            <p className="flex items-center gap-1.5 text-aux font-bold">
              <ScaleIcon aria-hidden className="size-[18px]" />
              {verdictLabel[last.verdict]}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {last.highlights.map((h) => (
                <Tag key={h}>{h}</Tag>
              ))}
            </div>
            <p className="text-caption text-ink-sub">
              {formatWhen(last.executed_at)} 실행 · 각 방식 {last.run_count}회 실행 결과
            </p>
            <ButtonLink to={`/comparisons/${last.id}`} icon={EyeIcon}>
              결과 다시 보기
            </ButtonLink>
          </>
        ) : (
          <ButtonLink
            to={candidate_id ? `/comparisons/new?candidate=${candidate_id}&match=${match.id}` : `/changes/${change.id}`}
            variant="primary"
            icon={ArrowsRightLeftIcon}
            disabled={!canCompare || !candidate_id}
          >
            내 작업으로 비교하기
          </ButtonLink>
        )}
        <div className="flex justify-center gap-1">
          <button type="button" onClick={later} disabled={decide.isPending} className="h-11 rounded-lg px-3 font-bold text-ink-sub hover:bg-ink/5 hover:text-ink">
            나중에
          </button>
          <button type="button" onClick={hide} disabled={decide.isPending} className="h-11 rounded-lg px-3 font-bold text-ink-sub hover:bg-ink/5 hover:text-ink">
            관심 없음
          </button>
        </div>
      </div>
    </article>
  )
}
