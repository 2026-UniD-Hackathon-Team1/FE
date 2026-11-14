export type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type Size = 'md' | 'sm'

/**
 * 디자인 시스템 버튼: 높이 44px, 모서리 8px.
 * 한 화면에 primary는 하나만 둔다. 결정 버튼(바꿔보기·기존 방식 유지)은 둘 다 secondary (P1).
 * 주요 버튼은 검정 배경 + 흰 글자 (Figma 디자인 시스템 18:442).
 */
const variantClass: Record<Variant, string> = {
  primary: 'bg-black text-white hover:bg-black/85 active:bg-black/75',
  secondary: 'bg-white text-ink border border-ink/55 hover:bg-bg-sub active:bg-bg-sub/80',
  ghost: 'text-ink-sub hover:bg-ink/5 hover:text-ink active:bg-ink/10',
  danger: 'bg-ink text-white hover:bg-ink/90 active:bg-ink/80',
}

const sizeClass: Record<Size, string> = {
  md: 'h-11 px-4 text-[15px] gap-1.5',
  sm: 'h-9 px-3 text-aux gap-1',
}

export function buttonClass(variant: Variant = 'secondary', size: Size = 'md', extra = '') {
  return [
    'inline-flex shrink-0 items-center justify-center rounded-lg font-bold whitespace-nowrap transition-[filter,background-color,opacity] duration-150',
    'disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45',
    variantClass[variant],
    sizeClass[size],
    extra,
  ].join(' ')
}

