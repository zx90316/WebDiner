<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import Loading from '@/components/Loading.vue'

const authStore = useAuthStore()
const toastStore = useToastStore()

const loading = ref(true)
const stats = ref<any>(null)
const startDate = ref('')
const endDate = ref('')

const loadStats = async () => {
    try {
        loading.value = true
        let endpoint = '/admin/stats'
        if (startDate.value && endDate.value) {
            endpoint += `?start_date=${startDate.value}&end_date=${endDate.value}`
        }
        const data = await api.get(endpoint, authStore.token!)
        stats.value = data
    } catch {
        toastStore.showToast('載入統計資料失敗', 'error')
    } finally {
        loading.value = false
    }
}

onMounted(() => {
    const today = new Date()
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    startDate.value = firstDay.toISOString().split('T')[0]
    endDate.value = today.toISOString().split('T')[0]
    loadStats()
})
</script>

<template>
    <div class="bg-white p-6 rounded-lg shadow">
        <h2 class="text-2xl font-bold mb-6">統計資料</h2>

        <div class="mb-6 flex flex-wrap gap-4 items-end">
            <div>
                <label class="block text-gray-700 mb-2 font-medium">開始日期</label>
                <input v-model="startDate" type="date" class="p-2 border rounded" />
            </div>
            <div>
                <label class="block text-gray-700 mb-2 font-medium">結束日期</label>
                <input v-model="endDate" type="date" class="p-2 border rounded" />
            </div>
            <button
                class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                @click="loadStats"
            >
                查詢
            </button>
        </div>

        <Loading v-if="loading" />
        <div v-else-if="stats" class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="bg-blue-50 p-4 rounded-lg">
                    <h3 class="text-lg font-bold text-blue-800">總訂單數</h3>
                    <p class="text-3xl font-bold text-blue-600">{{ stats.total_orders || 0 }}</p>
                </div>
                <div class="bg-green-50 p-4 rounded-lg">
                    <h3 class="text-lg font-bold text-green-800">訂餐人次</h3>
                    <p class="text-3xl font-bold text-green-600">{{ stats.total_users || 0 }}</p>
                </div>
                <div class="bg-purple-50 p-4 rounded-lg">
                    <h3 class="text-lg font-bold text-purple-800">廠商數</h3>
                    <p class="text-3xl font-bold text-purple-600">{{ stats.total_vendors || 0 }}</p>
                </div>
            </div>

            <div v-if="stats.by_vendor" class="overflow-x-auto">
                <h3 class="font-bold text-lg mb-3">各廠商訂單統計</h3>
                <table class="w-full">
                    <thead>
                        <tr class="bg-gray-100 border-b">
                            <th class="text-left p-3">廠商</th>
                            <th class="text-right p-3">訂單數</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(count, vendor) in stats.by_vendor" :key="vendor" class="border-b">
                            <td class="p-3">{{ vendor }}</td>
                            <td class="p-3 text-right font-medium">{{ count }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
        <div v-else class="text-center text-gray-500 py-8">
            無統計資料
        </div>
    </div>
</template>

