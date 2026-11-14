// S-00 로그인 (Figma 54:604). 서비스 소개 세 줄과 GitHub로 계속하기.
// 실제 GitHub OAuth는 백엔드가 준비되면 붙인다. 지금은 버튼을 누르면 온보딩으로 넘어간다.
import { useNavigate } from 'react-router'
import { Backdrop, Logo } from '../components/Brand'
import wordmarkSvg from '../assets/logo/wordmark.svg'
import githubSvg from '../assets/github.svg'

const points: [string, string][] = [
  ['내 환경에 영향을 주는 변화만', '쓰는 도구·스킬·작업과 관계없는 소식은 보여주지 않아요.'],
  ['내 작업으로 직접 비교', '같은 작업을 기존 방식과 새 방식으로 실행해서 결과를 나란히 보여줘요.'],
  ['언제든 되돌리기', '바꾸기 전에 백업하고, 한 번에 원래대로 돌아갈 수 있어요.'],
]

export function LoginPage() {
  const navigate = useNavigate()
  return (
    <>
      <Backdrop />
      <header className="flex h-[142px] items-center px-[57px]">
        <span className="flex items-center gap-[17px]">
          <Logo size={70} />
          <img src={wordmarkSvg} alt="갈아탈까" className="h-[38px] w-auto" />
        </span>
      </header>
      <main className="mx-auto max-w-[1110px] px-4 pt-[50px] pb-16">
        <h1 className="text-[33px] leading-[45px] font-bold tracking-[-0.38px]">새로 나온 AI 도구, 내 작업에서 정말 나을까요?</h1>
        <p className="mt-2.5 text-[20px] leading-[33px] text-ink-sub">
          갈아탈까는 내 환경에 영향을 주는 변화만 골라 알려주고, 내 작업으로 직접 비교해 본 뒤 바꿀지 정하게 도와줘요.
        </p>
        <section className="glass mt-[40px] grid gap-[30px] rounded-[15px] px-[35px] py-[30px]">
          {points.map(([title, desc]) => (
            <div key={title} className="grid gap-0.5">
              <h2 className="text-[21.5px] leading-[33px] font-bold">{title}</h2>
              <p className="text-[19px] leading-[30px] text-ink-sub">{desc}</p>
            </div>
          ))}
          <button
            type="button"
            onClick={() => void navigate('/onboarding')}
            className="flex w-full items-center justify-center gap-[12.6px] rounded-[10px] bg-black px-[25px] py-[15px] text-[20px] leading-[30px] font-bold text-white transition-colors duration-150 hover:bg-black/85"
          >
            <img src={githubSvg} alt="" width={25.238} height={25.238} />
            GitHub로 계속하기
          </button>
          <p className="text-[17.7px] leading-[28px] text-ink-sub">코드는 서버에 저장하지 않아요. 비교 기록과 결정만 남겨요.</p>
        </section>
      </main>
    </>
  )
}
