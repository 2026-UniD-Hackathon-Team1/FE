// 이력 기간 직접 선택 달력 (Figma 91:1797). 시작일과 끝일을 차례로 누르고 [적용].
import { useState } from 'react'
import { formatRange, type DayRange } from './range'

const WEEK = ['일', '월', '화', '수', '목', '금', '토']
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()

export function RangeCalendar({ initial, onApply }: { initial: DayRange | null; onApply: (r: DayRange) => void }) {
  const [month, setMonth] = useState(() => {
    const d = initial?.to ?? new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [from, setFrom] = useState<Date | null>(initial?.from ?? null)
  const [to, setTo] = useState<Date | null>(initial?.to ?? null)

  const pick = (d: Date) => {
    // 시작일만 고른 상태에서 그 뒤 날짜를 누르면 끝일, 아니면 새로 시작
    if (from && !to && d >= from) setTo(d)
    else {
      setFrom(d)
      setTo(null)
    }
  }

  const first = month.getDay()
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))] as (Date | null)[]
  const move = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1))

  return (
    <div className="mt-1.5 border-t border-ink/12 px-3.5 pt-3 pb-2">
      <div className="mb-2 flex items-center justify-between text-aux">
        <span className="text-ink-sub">기간 직접 선택</span>
        <span className="flex items-center gap-2 font-bold">
          <button type="button" aria-label="이전 달" onClick={() => move(-1)} className="px-1">
            ‹
          </button>
          {month.getFullYear()}년 {month.getMonth() + 1}월
          <button type="button" aria-label="다음 달" onClick={() => move(1)} className="px-1">
            ›
          </button>
        </span>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center text-aux">
        {WEEK.map((w) => (
          <span key={w} className="py-1 text-ink-sub">
            {w}
          </span>
        ))}
        {cells.map((d, i) => {
          if (!d) return <span key={`e${i}`} />
          const edge = (from && sameDay(d, from)) || (to && sameDay(d, to))
          const inRange = from && to && d > from && d < to
          return (
            <button
              key={d.getDate()}
              type="button"
              onClick={() => pick(d)}
              className={`mx-0.5 rounded-md py-1 ${edge ? 'bg-ink font-bold text-white' : inRange ? 'bg-main/16' : 'hover:bg-bg-sub'}`}
            >
              {d.getDate()}
            </button>
          )
        })}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-aux font-bold">{from ? formatRange({ from, to: to ?? from }) : '날짜를 골라 주세요'}</span>
        <button
          type="button"
          disabled={!from}
          onClick={() => from && onApply({ from, to: to ?? from })}
          className="rounded-lg bg-black px-3 py-1.5 text-aux font-bold text-white disabled:opacity-40"
        >
          적용
        </button>
      </div>
    </div>
  )
}
