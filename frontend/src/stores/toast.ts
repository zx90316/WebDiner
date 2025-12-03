import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
    id: number
    message: string
    type: ToastType
}

export const useToastStore = defineStore('toast', () => {
    const toasts = ref<Toast[]>([])

    const showToast = (message: string, type: ToastType) => {
        const id = Date.now()
        toasts.value.push({ id, message, type })
        
        setTimeout(() => {
            removeToast(id)
        }, 4000)
    }

    const removeToast = (id: number) => {
        toasts.value = toasts.value.filter(t => t.id !== id)
    }

    return {
        toasts,
        showToast,
        removeToast
    }
})

