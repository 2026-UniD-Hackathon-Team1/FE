// S-01 온보딩 / 환경 연결: 프로젝트 연결, 도구·모델·스킬 확인, 기존 작업 방식과 필수 조건 등록 (FR-01, 02)
import { Link } from 'react-router'
import { PageHeader } from '../components/PageHeader'

export function OnboardingPage() {
  // TODO: 단계형 폼 — 1) 프로젝트·작업 폴더 2) 인식된 환경 확인·수정 3) 작업 유형·프롬프트·필수 조건
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <PageHeader title="갈아탈까 시작하기" description="내 프로젝트와 AI 작업 환경을 연결해요." />
      <Link to="/" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white">
        홈으로
      </Link>
    </div>
  )
}
