<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import Loading from '@/components/Loading.vue'
import LoadingButton from '@/components/LoadingButton.vue'

interface MissingUser {
    employee_id: string
    name: string
    email: string
}

const authStore = useAuthStore()
const toastStore = useToastStore()

const missingUsers = ref<MissingUser[]>([])
const loading = ref(true)
const sending = ref(false)
const date = ref(new Date().toISOString().split('T')[0])

const loadMissing = async () => {
    try {
        loading.value = true
        const data = await api.get(`/admin/reminders/missing?target_date=${date.value}`, authStore.token!)
        missingUsers.value = data
    } catch {
        toastStore.showToast('載入未訂餐用戶失敗', 'error')
    } finally {
        loading.value = false
    }
}

const sendReminders = async () => {
    try {
        sending.value = true
        const res = await api.post(`/admin/reminders/send?target_date=${date.value}`, {}, authStore.token!)
        toastStore.showToast(res.message || '提醒郵件已發送', 'success')
    } catch (error: any) {
        toastStore.showToast(error.message || '發送提醒失敗', 'error')
    } finally {
        sending.value = false
    }
}

watch(date, () => {
    loadMissing()
})

onMounted(() => {
    loadMissing()
})
</script>

<template>
    <div class="bg-white p-6 rounded-lg shadow">
        <h2 class="text-2xl font-bold mb-6">訂餐提醒</h2>

        <div class="mb-6 flex flex-col sm:flex-row gap-4">
            <div class="flex-1">
                <label class="block text-gray-700 mb-2 font-medium">查詢日期</label>
                <input
                    v-model="date"
                    type="date"
                    class="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
            </div>
            <div class="flex items-end">
                <LoadingButton
                    :loading="sending"
                    :disabled="missingUsers.length === 0"
                    :class="[
                        'px-6 py-2 rounded transition font-medium',
                        missingUsers.length === 0
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                    ]"
                    @click="sendReminders"
                >
                    發送群組提醒郵件
                </LoadingButton>
            </div>
        </div>

        <Loading v-if="loading" />
        <template v-else>
            <div class="mb-4 p-4 bg-gray-50 rounded-lg">
                <h3 class="font-bold mb-2">
                    未訂餐人數：
                    <span :class="missingUsers.length > 0 ? 'text-red-600' : 'text-green-600'">
                        {{ missingUsers.length }}
                    </span>
                </h3>
            </div>

            <div v-if="missingUsers.length === 0" class="text-center text-green-600 py-8">
                <p class="text-lg font-medium">太棒了！所有人都已完成訂餐</p>
            </div>
            <div v-else class="overflow-x-auto">
                <table class="w-full">
                    <thead>
                        <tr class="bg-gray-100 border-b">
                            <th class="text-left p-3 font-semibold">工號</th>
                            <th class="text-left p-3 font-semibold">姓名</th>
                            <th class="text-left p-3 font-semibold">信箱</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="user in missingUsers" :key="user.employee_id" class="border-b hover:bg-gray-50">
                            <td class="p-3 font-mono">{{ user.employee_id }}</td>
                            <td class="p-3">{{ user.name }}</td>
                            <td class="p-3 text-sm text-gray-600">{{ user.email }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </template>
    </div>
</template>
