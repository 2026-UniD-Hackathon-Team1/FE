import { useEffect, useRef, useState, type ComponentType, type ReactNode, type SVGProps } from 'react'
import { CheckIcon, ChevronDownIcon } from '@heroicons/react/24/outline'

type Icon = ComponentType<SVGProps<SVGSVGElement>>

/**
 * 동그란 필터 버튼 + 아래로 열리는 목록 (Figma 91:1338, 91:1532).
 * 바깥을 누르거나 Esc를 누르면 닫힌다. children이 있으면 목록 아래에 덧붙인다 (기간 직접 선택 등).
 */
export function Dropdown<T extends string | number>({
  label,
  icon: I,
  value,
  options,
  onChange,
  width = 200,
  children,
}: {
  label: ReactNode
  icon?: Icon
  value: T | null
  options: [T, string][]
  onChange: (v: T) => void
  width?: number
  children?: (close: () => void) => ReactNode
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={`inline-flex h-9 items-center gap-1.5 rounded-full border bg-white px-3 text-aux font-medium transition-colors duration-150 hover:bg-bg-sub ${
          open ? 'border-ink' : 'border-ink/55'
        }`}
      >
        {I && <I aria-hidden className="size-4" />}
        {label}
        <ChevronDownIcon aria-hidden className="size-4" />
      </button>
      {open && (
        <div
          role="listbox"
          style={{ width }}
          className="absolute top-full right-0 z-20 mt-1.5 overflow-hidden rounded-[10px] border border-black/15 bg-white py-1.5 shadow-[0_8px_24px_rgb(59_38_48/0.14)] animate-fade-in"
        >
          {options.map(([v, text]) => {
            const selected = v === value
            return (
              <button
                key={String(v)}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(v)
                  setOpen(false)
                }}
                className={`flex w-full items-center gap-2 py-2 pr-2.5 pl-3.5 text-left text-[15px] leading-[23px] ${selected ? 'bg-main/16 font-bold' : 'hover:bg-bg-sub'}`}
              >
                <span className="flex-1">{text}</span>
                {selected && <CheckIcon aria-hidden className="size-[18px]" />}
              </button>
            )
          })}
          {children?.(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}
