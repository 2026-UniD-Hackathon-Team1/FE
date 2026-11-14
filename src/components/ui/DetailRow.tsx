import { useState, type ReactNode } from 'react'
import { ChevronRightIcon } from '@heroicons/react/24/outline'
import { Modal } from './Modal'
import { Button } from './Button'

interface DetailRowProps {
  title: ReactNode
  /** 접힌 상태에서 보이는 한 줄 요약 */
  summary: ReactNode
  icon?: ReactNode
  /** 팝업 제목. 없으면 title */
  modalTitle?: ReactNode
  modalWidth?: number
  tone?: 'default' | 'sub'
  /** 팝업 내용 */
  children: ReactNode
  footer?: (close: () => void) => ReactNode
  /** 좁은 칸에서는 요약을 제목 아래로 */
  stacked?: boolean
}

/** 정보가 많은 섹션을 한 줄로 접고, "자세히 보기"를 누르면 팝업으로 연다 */
export function DetailRow({ title, summary, icon, modalTitle, modalWidth = 1000, tone = 'default', children, footer, stacked }: DetailRowProps) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${tone === 'sub' ? 'glass-sub' : 'glass'} group flex w-full gap-x-4 gap-y-1 px-6 py-6 text-left transition-colors duration-150 hover:bg-white/85 ${
          stacked ? 'flex-col' : 'flex-wrap items-center'
        }`}
      >
        <span className="flex items-center gap-2 text-title2">
          {icon}
          {title}
        </span>
        <span className="min-w-0 flex-1 text-aux text-ink-sub">{summary}</span>
        <span className="inline-flex items-center gap-1 text-aux font-medium whitespace-nowrap group-hover:underline">
          자세히 보기
          <ChevronRightIcon aria-hidden className="size-3.5" />
        </span>
      </button>
      <Modal
        open={open}
        onClose={close}
        title={modalTitle ?? title}
        width={modalWidth}
        footer={footer ? footer(close) : <Button onClick={close}>닫기</Button>}
      >
        {children}
      </Modal>
    </>
  )
}
