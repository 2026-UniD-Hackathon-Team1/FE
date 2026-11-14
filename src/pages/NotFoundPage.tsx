import { Link } from 'react-router'
import { EmptyState } from '../components/States'

export function NotFoundPage() {
  return (
    <EmptyState
      title="페이지를 찾을 수 없어요"
      description={
        <Link to="/" className="underline">
          홈으로 가기
        </Link>
      }
    />
  )
}
