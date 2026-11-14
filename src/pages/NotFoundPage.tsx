import { HomeIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline'
import { PageHeader } from '../components/PageHeader'
import { ButtonLink } from '../components/ui/Button'

export function NotFoundPage() {
  return (
    <>
      <PageHeader title="페이지를 찾을 수 없어요" description="주소가 바뀌었거나 지워진 페이지예요." />
      <div className="glass flex flex-col items-center px-6 py-14 text-center">
        <QuestionMarkCircleIcon aria-hidden className="mb-3 size-8" />
        <p className="text-title3">찾는 페이지가 없어요</p>
        <p className="mt-1.5 text-aux text-ink-sub">홈에서 다시 시작해 주세요</p>
        <ButtonLink to="/" icon={HomeIcon} className="mt-5">
          홈으로 가기
        </ButtonLink>
      </div>
    </>
  )
}
