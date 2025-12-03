<script setup lang="ts">
import { ref } from 'vue'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import LoadingButton from '@/components/LoadingButton.vue'

const authStore = useAuthStore()
const toastStore = useToastStore()

const sending = ref(false)
const targetDate = ref('')
const result = ref<any>(null)

const sendReminders = async () => {
    if (!targetDate.value) {
        toastStore.showToast('請選擇日期', 'error')
        return
    }

    try {
        sending.value = true
        const data = await api.post('/admin/send-reminders', {
            date: targetDate.value
        }, authStore.token!)
        result.value = data
        toastStore.showToast('提醒發送成功', 'success')
    } catch (error: any) {
        toastStore.showToast(error.message || '發送失敗', 'error')
    } finally {
        sending.value = false
    }
}
</script>

<template>
    <div class="bg-white p-6 rounded-lg shadow">
        <h2 class="text-2xl font-bold mb-6">訂餐提醒</h2>

        <div class="mb-6 bg-gray-50 p-6 rounded-lg border">
            <h3 class="font-bold mb-4">發送訂餐提醒</h3>
            <p class="text-gray-600 mb-4">
                選擇日期後，系統會發送提醒給尚未訂餐的人員。
            </p>
            <div class="flex gap-4 items-end">
                <div>
                    <label class="block text-gray-700 mb-2 font-medium">目標日期</label>
                    <input v-model="targetDate" type="date" class="p-2 border rounded" />
                </div>
                <LoadingButton
                    :loading="sending"
                    class="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
                    @click="sendReminders"
                >
                    發送提醒
                </LoadingButton>
            </div>
        </div>

        <div v-if="result" class="bg-green-50 p-4 rounded-lg">
            <h4 class="font-bold text-green-800 mb-2">發送結果</h4>
            <p>已發送 {{ result.sent_count || 0 }} 封提醒</p>
        </div>
    </div>
</template>

