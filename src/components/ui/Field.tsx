import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { CheckIcon, ChevronDownIcon } from '@heroicons/react/24/outline'

const boxClass =
  'w-full rounded-lg border border-ink/20 bg-white px-3.5 text-[15px] placeholder:text-ink-sub/70 transition-colors duration-150 hover:border-ink/40 focus:border-ink focus:outline-none'

export function Field({ label, help, children }: { label: ReactNode; help?: ReactNode; children: (id: string) => ReactNode }) {
  const id = useId()
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-aux font-bold">
        {label}
      </label>
      {children(id)}
      {help && <p className="text-caption text-ink-sub">{help}</p>}
    </div>
  )
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${boxClass} h-11 ${props.className ?? ''}`} />
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={`${boxClass} resize-none py-2.5 leading-6 ${props.className ?? ''}`} />
}

export function Select({ children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select {...props} className={`${boxClass} h-11 appearance-none pr-10 ${props.className ?? ''}`}>
        {children}
      </select>
      <ChevronDownIcon aria-hidden className="pointer-events-none absolute top-1/2 right-3 size-[18px] -translate-y-1/2 text-ink-sub" />
    </div>
  )
}

export function Checkbox({ checked, onChange, children, description }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode; description?: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span
        aria-hidden
        className={`mt-[3px] flex size-[18px] shrink-0 items-center justify-center rounded-[4px] border transition-colors duration-150 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink ${
          checked ? 'border-ink bg-ink text-white' : 'border-ink/55 bg-white'
        }`}
      >
        {checked && <CheckIcon className="size-3.5 stroke-[2.5]" />}
      </span>
      <span className="grid">
        <span className="text-body">{children}</span>
        {description && <span className="text-aux text-ink-sub">{description}</span>}
      </span>
    </label>
  )
}

/** 큰 선택지 (판정 수정, 충돌 처리) */
export function RadioCard({ name, checked, onChange, title, description }: { name: string; checked: boolean; onChange: () => void; title: ReactNode; description?: ReactNode }) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-[10px] border px-3.5 py-3 transition-colors duration-150 ${
        checked ? 'border-ink/55 bg-bg-sub' : 'border-ink/12 hover:bg-bg-sub/60'
      }`}
    >
      <input type="radio" name={name} className="peer sr-only" checked={checked} onChange={onChange} />
      <span
        aria-hidden
        className={`mt-1 size-[18px] shrink-0 rounded-full border-ink bg-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink ${
          checked ? 'border-[6px]' : 'border-[1.5px]'
        }`}
      />
      <span className="grid">
        <span className="font-bold">{title}</span>
        {description && <span className="text-aux text-ink-sub">{description}</span>}
      </span>
    </label>
  )
}
