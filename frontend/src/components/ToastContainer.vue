<script setup lang="ts">
import { useToastStore } from '@/stores/toast'

const toastStore = useToastStore()
</script>

<template>
    <div class="fixed top-4 right-4 z-50 flex flex-col gap-2">
        <div
            v-for="toast in toastStore.toasts"
            :key="toast.id"
            :class="[
                'px-4 py-3 rounded-lg shadow-lg text-white animate-slide-in',
                toast.type === 'success' ? 'bg-green-500' :
                toast.type === 'error' ? 'bg-red-500' :
                'bg-blue-500'
            ]"
        >
            {{ toast.message }}
        </div>
    </div>
</template>

