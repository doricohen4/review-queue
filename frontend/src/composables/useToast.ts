import { ref } from 'vue'

export type ToastTone = 'info' | 'success' | 'error'

export type Toast = {
  id: number
  tone: ToastTone
  message: string
}

const toasts = ref<Toast[]>([])
let nextId = 1

export function useToast() {
  function push(message: string, tone: ToastTone = 'info', ms = 5000): void {
    const id = nextId
    nextId += 1
    toasts.value = [...toasts.value, { id, tone, message }]
    window.setTimeout(() => dismiss(id), ms)
  }

  function dismiss(id: number): void {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  return { toasts, push, dismiss }
}
