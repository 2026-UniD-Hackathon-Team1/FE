/** 로고 마크: 갈아탈까의 "?" — 바꿀지 묻는다 */
export function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--color-main)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="17" r="1.1" fill="currentColor" />
    </svg>
  )
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2 text-[19px] font-bold tracking-tight">
      <Logo />
      갈아탈까
    </span>
  )
}

/** 배경의 핑크 빛 번짐. 글래스 카드가 비쳐 보이게 하는 바탕 */
export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-40 -right-40 size-[640px] rounded-full bg-main/26 blur-[120px]" />
      <div className="absolute top-[45%] left-[30%] size-[520px] rounded-full bg-main/16 blur-[120px]" />
      <div className="absolute -bottom-48 right-[10%] size-[560px] rounded-full bg-ink/6 blur-[120px]" />
    </div>
  )
}
