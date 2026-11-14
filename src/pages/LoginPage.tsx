// S-00 시작 화면 (Figma 141:1079 로그인, 141:1356 회원가입, 141:1639 로그인 오류). 서비스 소개 세 줄 + 로그인·회원가입.
// 실제 서버에 붙어 있으면 아이디·비밀번호로 로그인한다. 목 서버(주소 없음)에서는 같은 폼을 보여주고 누르면 바로 온보딩으로 간다.
import { useId, useState, type FormEvent, type InputHTMLAttributes } from 'react'
import { useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../api/client'
import { api } from '../api/endpoints'
import { loginEnabled } from '../api/session'
import { Backdrop, Logo } from '../components/Brand'
import wordmarkSvg from '../assets/logo/wordmark.svg'

const points: [string, string][] = [
  ['내 환경에 영향을 주는 변화만', '쓰는 도구·스킬·작업과 관계없는 소식은 보여주지 않아요.'],
  ['내 작업으로 직접 비교', '같은 작업을 기존 방식과 새 방식으로 실행해서 결과를 나란히 보여줘요.'],
  ['언제든 되돌리기', '바꾸기 전에 백업하고, 한 번에 원래대로 돌아갈 수 있어요.'],
]

type Mode = 'login' | 'signup'
const USERNAME = /^[a-z0-9_-]{3,30}$/

/** 서버 오류를 화면 문구로. 로그인 실패는 어느 칸이 틀렸는지 알려주지 않는다 */
function authError(err: unknown, mode: Mode): { text: string; field?: 'username' | 'password' } {
  if (err instanceof ApiError) {
    if (err.status === 0) return { text: '서버에 연결할 수 없어요. 잠시 뒤 다시 시도해 주세요.' }
    if (mode === 'login' && (err.status === 401 || err.status === 404)) return { text: '아이디나 비밀번호가 맞지 않아요.', field: 'password' }
    if (mode === 'signup' && err.status === 409) return { text: '이미 쓰고 있는 아이디예요.', field: 'username' }
    return { text: err.message }
  }
  return { text: '잠시 뒤 다시 시도해 주세요.' }
}

/** 시작 화면 입력칸 (Figma 141:1343). 라벨 17.7 Bold, 칸 높이 55.5, 오류면 진한 테두리 */
function AuthField({
  label,
  help,
  invalid,
  ...input
}: { label: string; help?: string; invalid?: boolean } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  return (
    <div className="grid gap-[7.6px]">
      <label htmlFor={id} className="text-[17.7px] leading-[26.5px] font-bold">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={invalid}
        {...input}
        className={`h-[55.5px] w-full rounded-[10px] bg-white px-[17.7px] text-[18.9px] leading-[28.4px] transition-colors duration-150 placeholder:text-ink-sub/70 focus:outline-none ${
          invalid ? 'border-[1.5px] border-ink/90' : 'border border-ink/20 hover:border-ink/40 focus:border-ink'
        }`}
      />
      {help && <p className="text-[15.1px] leading-[22.7px] text-ink-sub">{help}</p>}
    </div>
  )
}

function AuthForm() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [mode, setMode] = useState<Mode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<ReturnType<typeof authError> | null>(null)

  const nameOk = USERNAME.test(username)
  const pwOk = password.length >= 8
  const mismatch = mode === 'signup' && confirm !== '' && confirm !== password
  // 목 서버(주소 없음)에서는 입력 없이 바로 온보딩으로
  const valid = !loginEnabled || (nameOk && pwOk && (mode === 'login' || password === confirm))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!valid || busy) return
    if (!loginEnabled) return void navigate('/onboarding')
    setBusy(true)
    setError(null)
    try {
      await (mode === 'signup' ? api.signup(username, password) : api.login(username, password))
      qc.clear()
      // 프로필이 있으면 홈, 없으면 홈에서 온보딩으로 보낸다
      void navigate('/', { replace: true })
    } catch (err) {
      setError(authError(err, mode))
      setBusy(false)
    }
  }

  const switchTo = (m: Mode) => {
    setMode(m)
    setError(null)
    setConfirm('')
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="glass grid content-start gap-[25px] rounded-[15px] p-[35px]" noValidate>
      <div role="tablist" aria-label="로그인 또는 회원가입" className="grid grid-cols-2 gap-[5px] rounded-[12.6px] bg-ink/5 p-[5px]">
        {(
          [
            ['login', '로그인'],
            ['signup', '회원가입'],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => switchTo(m)}
            className={`rounded-[10px] py-[10px] text-[20.2px] leading-[30.3px] font-bold transition-colors duration-150 ${
              mode === m ? 'bg-white shadow-[0_1px_3px_rgb(0_0_0/0.06)]' : 'text-ink-sub hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <AuthField
        label="아이디"
        help={mode === 'signup' ? '영문 소문자, 숫자, _ - 로 3~30자' : undefined}
        value={username}
        onChange={(e) => setUsername(e.target.value.trim().toLowerCase())}
        autoComplete="username"
        autoCapitalize="off"
        spellCheck={false}
        placeholder="junior_dev"
        invalid={(username !== '' && !nameOk) || error?.field === 'username'}
      />
      <AuthField
        label="비밀번호"
        help={mode === 'signup' ? '8자 이상' : undefined}
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
        invalid={(mode === 'signup' && password !== '' && !pwOk) || error?.field === 'password'}
      />
      {mode === 'signup' && (
        <AuthField
          label="비밀번호 확인"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          invalid={mismatch}
          help={mismatch ? '비밀번호가 서로 달라요.' : undefined}
        />
      )}

      {error && (
        <p role="alert" className="text-[17.7px] leading-[26.5px] font-bold">
          {error.text}
        </p>
      )}

      <button
        type="submit"
        disabled={!valid || busy}
        className="flex h-[60.6px] w-full items-center justify-center rounded-[12.6px] bg-black text-[21.5px] leading-[32.2px] font-bold text-white transition-colors duration-150 hover:bg-black/85 disabled:opacity-45"
      >
        {busy ? '잠시만요…' : mode === 'signup' ? '가입하고 시작하기' : '로그인'}
      </button>
      <p className="flex gap-[5px] text-[17.7px] leading-[26.5px] text-ink-sub">
        {mode === 'login' ? '갈아탈까가 처음이신가요?' : '이미 계정이 있어요.'}
        <button type="button" className="font-bold text-ink underline" onClick={() => switchTo(mode === 'login' ? 'signup' : 'login')}>
          {mode === 'login' ? '회원가입' : '로그인'}
        </button>
      </p>
    </form>
  )
}

export function LoginPage() {
  return (
    <>
      <Backdrop />
      <header className="flex h-[142px] items-center px-[57px]">
        <span className="flex items-center gap-[17px]">
          <Logo size={70} />
          <img src={wordmarkSvg} alt="갈아탈까" className="h-[38px] w-auto" />
        </span>
      </header>
      <main className="mx-auto max-w-[1142px] px-4 pt-[50px] pb-16">
        <h1 className="text-[33px] leading-[45px] font-bold tracking-[-0.38px]">새로 나온 AI 도구, 내 작업에서 정말 효율적일까요?</h1>
        <p className="mt-2.5 text-[20px] leading-[33px] text-ink-sub">
          갈아탈까는 <b>내</b> 환경에 영향을 주는 변화만 골라 알려주고, <b>내</b> 작업으로 직접 비교해 본 뒤 바꿀지 정하게 도와줘요.
        </p>
        <div className="mt-[31px] grid items-start gap-[25px] lg:grid-cols-[1fr_485px]">
          <section className="glass grid gap-[30px] rounded-[15px] px-[35px] py-[30px]">
            {points.map(([title, desc]) => (
              <div key={title} className="grid gap-0.5">
                <h2 className="text-[21.5px] leading-[33px] font-bold">{title}</h2>
                <p className="text-[19px] leading-[30px] text-ink-sub">{desc}</p>
              </div>
            ))}
            <p className="text-[17.7px] leading-[28px] text-ink-sub">※ 코드는 서버에 저장하지 않아요. 비교 기록과 결정만 남겨요.</p>
          </section>
          <AuthForm />
        </div>
      </main>
    </>
  )
}
