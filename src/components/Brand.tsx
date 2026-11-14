import markImg from '../assets/logo/mark.png'
import wordmarkSvg from '../assets/logo/wordmark.svg'

/**
 * 로고 마크 (Figma 컴포넌트 "Logo / 갈아탈까 · 굵게" 66:598).
 * 검은 네모 위에 같은 그림을 조금씩 어긋나게 9번 겹쳐(밝게 합치기) 획을 굵게 보이게 한다.
 */
const markOffsets: [number, number][] = [
  [2.38, 2.09],
  [2.59, 1.88],
  [2.38, 1.79],
  [2.16, 1.88],
  [2.08, 2.09],
  [2.16, 2.3],
  [2.38, 2.39],
  [2.59, 2.3],
  [2.68, 2.09],
]

/** size: 마크 한 변(px). 기본 36, 로그인 화면은 70 (Figma 54:607) */
export function Logo({ size = 36 }: { size?: number }) {
  const k = size / 36
  const radius = 7.2 * k
  return (
    <span aria-hidden className="relative block shrink-0 bg-black" style={{ width: size, height: size, borderRadius: radius }}>
      {markOffsets.map(([x, y], i) => (
        <img
          key={i}
          src={markImg}
          alt=""
          className="absolute object-cover mix-blend-lighten"
          style={{ left: x * k, top: y * k, width: 31.32 * k, height: 31.852 * k, borderRadius: radius }}
        />
      ))}
    </span>
  )
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <Logo />
      <img src={wordmarkSvg} alt="갈아탈까" width={81.278} height={22} />
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
