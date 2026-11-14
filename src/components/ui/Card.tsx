import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title?: ReactNode
  /** 제목 오른쪽 (배지, 보조 설명, 작은 버튼) */
  aside?: ReactNode
  tone?: 'default' | 'sub'
  padded?: boolean
}

/** 글래스 섹션 카드. 화면의 네모난 섹션은 전부 이걸로 그린다. */
export function Card({ title, aside, tone = 'default', padded = true, className = '', children, ...rest }: CardProps) {
  return (
    <section className={`${tone === 'sub' ? 'glass-sub' : 'glass'} ${padded ? 'p-6' : ''} ${className}`} {...rest}>
      {(title || aside) && (
        <header className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          {typeof title === 'string' ? <h2 className="text-title2">{title}</h2> : title}
          {aside && <div className="flex items-center gap-2 text-aux text-ink-sub">{aside}</div>}
        </header>
      )}
      {children}
    </section>
  )
}

/** 라벨 : 값 목록 (출처와 관리 상태 등) */
export function InfoList({ items, labelWidth = 'w-24' }: { items: [ReactNode, ReactNode][]; labelWidth?: string }) {
  return (
    <dl className="grid gap-2">
      {items.map(([k, v], i) => (
        <div key={i} className="flex gap-4 text-aux">
          <dt className={`${labelWidth} shrink-0 text-ink-sub`}>{k}</dt>
          <dd className="min-w-0 flex-1 font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  )
}
