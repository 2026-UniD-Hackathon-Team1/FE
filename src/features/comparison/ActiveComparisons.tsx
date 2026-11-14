// S-02 홈: 진행 중인 비교 · 적용 상태 (6.1장). 실행 중이면 2초마다 갱신된다.
import { Link } from 'react-router'
import { ChevronRightIcon } from '@heroicons/react/24/outline'
import { useActiveComparisons } from '../../api/queries'
import { comparisonStatusLabel, formatWhen } from '../../lib/labels'
import type { ComparisonStatus } from '../../types/domain'

const ORDER: ComparisonStatus[] = ['queued', 'running_baseline', 'running_candidate', 'evaluating', 'done']

export function ActiveComparisons() {
  const q = useActiveComparisons()
  if (!q.data?.length) return null

  return (
    <section aria-labelledby="active" className="glass px-6 py-5">
      <h2 id="active" className="mb-3 text-title3">
        진행 중인 비교
      </h2>
      <ul className="rows">
        {q.data.map((c) => {
          const step = Math.max(ORDER.indexOf(c.status), 0)
          const done = c.status === 'done'
          const pct = Math.round(((step + (done ? 0 : 0.5)) / (ORDER.length - 1)) * 100)
          return (
            <li key={c.id}>
              <Link to={`/comparisons/${c.id}`} className="group flex flex-wrap items-center gap-x-5 gap-y-2 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block font-bold group-hover:underline">{c.change_title}</span>
                  <span className="block text-aux text-ink-sub">
                    {c.candidate_label} · {formatWhen(c.started_at)} 시작
                  </span>
                </span>
                <span className="flex w-64 flex-col gap-1.5">
                  <span className="flex justify-between text-caption">
                    <span>{done ? '완료 · 결과를 확인해 주세요' : comparisonStatusLabel[c.status]}</span>
                    {!done && (
                      <span className="font-normal text-ink-sub">
                        {step + 1}/{ORDER.length}단계
                      </span>
                    )}
                  </span>
                  <span
                    role="progressbar"
                    aria-valuenow={Math.min(pct, 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${c.change_title} 비교 진행`}
                    className="h-1.5 overflow-hidden rounded-full bg-ink/12"
                  >
                    <span className={`block h-full rounded-full transition-[width] duration-300 ${done ? 'bg-ink' : 'bg-main'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </span>
                </span>
                <span className="inline-flex items-center gap-0.5 text-aux font-bold">
                  {done ? '결과 보기' : '진행 보기'}
                  <ChevronRightIcon aria-hidden className="size-4" />
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
