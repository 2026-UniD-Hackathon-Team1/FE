// S-00 시작 화면 (Figma 54:604). 서비스 소개 세 줄 + 로그인·회원가입.
// 실제 서버에 붙어 있으면 아이디·비밀번호로 로그인한다. 목 서버(주소 없음)에서는 바로 온보딩으로 간다.
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../api/endpoints'
import { loginEnabled } from '../api/session'
import { Backdrop, Logo } from '../components/Brand'
import { Field, TextInput } from '../components/ui/Field'
import wordmarkSvg from '../assets/logo/wordmark.svg'

const points: [string, string][] = [
  ['내 환경에 영향을 주는 변화만', '쓰는 도구·스킬·작업과 관계없는 소식은 보여주지 않아요.'],
  ['내 작업으로 직접 비교', '같은 작업을 기존 방식과 새 방식으로 실행해서 결과를 나란히 보여줘요.'],
  ['언제든 되돌리기', '바꾸기 전에 백업하고, 한 번에 원래대로 돌아갈 수 있어요.'],
]

type Mode = 'login' | 'signup'
const USERNAME = /^[a-z0-9_-]{3,30}$/

function AuthForm() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [mode, setMode] = useState<Mode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const nameOk = USERNAME.test(username)
  const pwOk = password.length >= 8
  const valid = nameOk && pwOk && (mode === 'login' || password === confirm)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!valid || busy) return
    setBusy(true)
    setError(null)
    try {
      await (mode === 'signup' ? api.signup(username, password) : api.login(username, password))
      qc.clear()
      // 프로필이 있으면 홈, 없으면 홈에서 온보딩으로 보낸다
      void navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '잠시 뒤 다시 시도해 주세요.')
      setBusy(false)
    }
  }

  const switchTo = (m: Mode) => {
    setMode(m)
    setError(null)
    setConfirm('')
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="glass grid content-start gap-5 rounded-[15px] px-7 py-7" noValidate>
      <div role="tablist" aria-label="로그인 또는 회원가입" className="grid grid-cols-2 gap-1 rounded-[10px] bg-ink/5 p-1">
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
            className={`h-10 rounded-lg text-body font-bold transition-colors duration-150 ${mode === m ? 'bg-white shadow-sm' : 'text-ink-sub hover:text-ink'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <Field label="아이디" help={mode === 'signup' ? '영문 소문자, 숫자, _ - 로 3~30자' : undefined}>
        {(id) => (
          <TextInput
            id={id}
            value={username}
            onChange={(e) => setUsername(e.target.value.trim().toLowerCase())}
            autoComplete="username"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="junior_dev"
            aria-invalid={username !== '' && !nameOk}
          />
        )}
      </Field>
      <Field label="비밀번호" help={mode === 'signup' ? '8자 이상' : undefined}>
        {(id) => (
          <TextInput
            id={id}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            aria-invalid={password !== '' && !pwOk}
          />
        )}
      </Field>
      {mode === 'signup' && (
        <Field label="비밀번호 확인">
          {(id) => (
            <TextInput
              id={id}
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              aria-invalid={confirm !== '' && confirm !== password}
            />
          )}
        </Field>
      )}
      {mode === 'signup' && confirm !== '' && confirm !== password && <p className="-mt-3 text-aux text-ink-sub">비밀번호가 서로 달라요.</p>}

      {error && (
        <p role="alert" className="text-aux font-bold">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!valid || busy}
        className="flex h-12 w-full items-center justify-center rounded-[10px] bg-black text-[17px] font-bold text-white transition-colors duration-150 hover:bg-black/85 disabled:opacity-45"
      >
        {busy ? '잠시만요…' : mode === 'signup' ? '가입하고 시작하기' : '로그인'}
      </button>
      <p className="text-aux text-ink-sub">
        {mode === 'login' ? '처음이세요? ' : '이미 계정이 있어요. '}
        <button type="button" className="font-bold text-ink underline" onClick={() => switchTo(mode === 'login' ? 'signup' : 'login')}>
          {mode === 'login' ? '회원가입' : '로그인'}
        </button>
      </p>
    </form>
  )
}

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
        <div className="mt-[40px] grid items-start gap-5 lg:grid-cols-[1fr_400px]">
          <section className="glass grid gap-[30px] rounded-[15px] px-[35px] py-[30px]">
            {points.map(([title, desc]) => (
              <div key={title} className="grid gap-0.5">
                <h2 className="text-[21.5px] leading-[33px] font-bold">{title}</h2>
                <p className="text-[19px] leading-[30px] text-ink-sub">{desc}</p>
              </div>
            ))}
            <p className="text-[17.7px] leading-[28px] text-ink-sub">코드는 서버에 저장하지 않아요. 비교 기록과 결정만 남겨요.</p>
          </section>
          {loginEnabled ? (
            <AuthForm />
          ) : (
            // 목 서버로 개발할 때는 로그인 없이 바로
            <div className="glass grid gap-4 rounded-[15px] px-7 py-7">
              <p className="text-aux text-ink-sub">목 서버로 실행 중이라 로그인 없이 시작해요.</p>
              <button
                type="button"
                onClick={() => void navigate('/onboarding')}
                className="flex h-12 w-full items-center justify-center rounded-[10px] bg-black text-[17px] font-bold text-white hover:bg-black/85"
              >
                시작하기
              </button>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
