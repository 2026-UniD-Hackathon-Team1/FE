import { useSyncExternalStore } from 'react'
import { CheckCircleIcon } from '@heroicons/react/24/outline'

import { current, listeners } from './toastStore'

export function Toaster() {
  const t = useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => current,
  )
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      {t && (
        <div key={t.id} className="flex animate-pop-in items-center gap-2 rounded-xl bg-ink px-4 py-3 text-aux font-medium text-white shadow-popup">
          <CheckCircleIcon aria-hidden className="size-5" />
          {t.text}
        </div>
      )}
    </div>
  )
}
