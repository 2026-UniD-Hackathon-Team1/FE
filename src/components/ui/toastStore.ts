// 가벼운 알림 ("나중에 다시 보여 드릴게요" 등). 3초 뒤 사라진다.
export let current: { id: number; text: string } | null = null
export const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function toast(text: string) {
  const id = Date.now()
  current = { id, text }
  emit()
  setTimeout(() => {
    if (current?.id === id) {
      current = null
      emit()
    }
  }, 3000)
}

