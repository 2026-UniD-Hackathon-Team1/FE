// 6.5: 숫자에는 단위와 기준을 함께 쓴다. 숫자는 반드시 이 컴포넌트로 표시한다.
interface MetricProps {
  value: number | null
  unit: string
  basis: string
  /** 값이 없을 때 문구. 기본 "측정 실패" */
  emptyText?: string
}

export function Metric({ value, unit, basis, emptyText = '측정 실패' }: MetricProps) {
  if (value === null) return <span className="text-slate-400">{emptyText}</span>
  return (
    <span>
      <span className="font-semibold tabular-nums">
        {value.toLocaleString('ko-KR')}
        {unit}
      </span>{' '}
      <span className="text-xs text-slate-500">({basis})</span>
    </span>
  )
}
