import { useEffect, useRef, type ReactNode } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  footer?: ReactNode
  /** px. 표가 들어가는 팝업은 넓게 */
  width?: number
}

/**
 * 팝업. 정보가 많은 섹션은 화면에서 한 줄로 접고 여기서 연다.
 * 네이티브 <dialog>라서 Esc·포커스 가두기·배경(ink 50%)이 기본으로 동작한다.
 */
export function Modal({ open, onClose, title, children, footer, width = 640 }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      style={{ width: `min(${width}px, calc(100vw - 32px))` }}
      className="m-auto max-h-[calc(100dvh-64px)] rounded-[20px] border border-white/80 bg-white/92 p-0 text-ink shadow-popup backdrop-blur-[20px] open:animate-pop-in"
    >
      {open && (
        <div className="flex max-h-[calc(100dvh-64px)] flex-col">
          <header className="flex items-start gap-3 px-7 pt-6 pb-4">
            <h2 className="flex-1 text-title2">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="-m-1 rounded-md p-1 text-ink-sub transition-colors hover:bg-ink/5 hover:text-ink"
            >
              <XMarkIcon className="size-6" />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-7 pb-2">{children}</div>
          <footer className="flex flex-wrap justify-end gap-2 px-7 pt-4 pb-6">{footer}</footer>
        </div>
      )}
    </dialog>
  )
}
