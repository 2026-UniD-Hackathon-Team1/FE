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
      className="m-auto max-h-[calc(100dvh-64px)] rounded-[20px] border border-black/30 bg-white p-0 text-ink shadow-popup open:animate-pop-in"
    >
      {open && (
        <div className="flex max-h-[calc(100dvh-64px)] flex-col gap-[18px] px-7 py-6">
          <header className="flex items-center gap-3">
            <h2 className="flex-1 text-title2 leading-[30px]">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="-m-1 rounded-md p-1 transition-colors hover:bg-ink/5"
            >
              <XMarkIcon className="size-6" />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
          <footer className="flex flex-wrap justify-end gap-2">{footer}</footer>
        </div>
      )}
    </dialog>
  )
}
