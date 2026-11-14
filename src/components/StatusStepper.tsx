import type { ComparisonStatus } from '../types/domain'
import { comparisonStatusLabel } from '../lib/labels'

const STEPS: ComparisonStatus[] = ['queued', 'running_baseline', 'running_candidate', 'evaluating', 'done']

export function StatusStepper({ status }: { status: ComparisonStatus }) {
  const current = STEPS.indexOf(status)
  const stopped = current === -1

  return (
    <div>
      <ol className="flex gap-2">
        {STEPS.map((s, i) => {
          const state = stopped ? 'idle' : i < current ? 'done' : i === current ? 'active' : 'idle'
          return (
            <li key={s} className="flex-1">
              <div
                className={`h-1.5 rounded-full ${
                  state === 'done' ? 'bg-slate-700' : state === 'active' ? 'animate-pulse bg-slate-500' : 'bg-slate-200'
                }`}
              />
              <p className={`mt-1 text-xs ${state === 'idle' ? 'text-slate-400' : 'text-slate-700'}`}>
                {comparisonStatusLabel[s]}
              </p>
            </li>
          )
        })}
      </ol>
      {stopped && <p className="mt-2 text-sm text-red-700">{comparisonStatusLabel[status]}</p>}
    </div>
  )
}
