<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import Loading from '@/components/Loading.vue'

interface StatsItem {
    name: string
    description?: string
    count: number
    subtotal: number
}

interface StatsVendor {
    name: string
    total_orders: number
    total_price: number
    items: StatsItem[]
}

interface Stats {
    total_orders: number
    total_price: number
    vendors: StatsVendor[]
}

const authStore = useAuthStore()
const toastStore = useToastStore()

const stats = ref<Stats | null>(null)
const loading = ref(true)
const selectedDate = ref(new Date().toISOString().split('T')[0])

const loadStats = async () => {
    try {
        loading.value = true
        const data = await api.get(`/admin/stats?date=${selectedDate.value}`, authStore.token!)
        stats.value = data
    } catch {
        toastStore.showToast('載入統計資料失敗', 'error')
    } finally {
        loading.value = false
    }
}

watch(selectedDate, () => {
    loadStats()
})

onMounted(() => {
    loadStats()
})
</script>

<template>
    <Loading v-if="loading && !stats" />
    <div v-else class="bg-white p-6 rounded-lg shadow">
        <div class="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <h2 class="text-2xl font-bold">訂單統計</h2>
            <div class="flex items-center gap-4">
                <input
                    v-model="selectedDate"
                    type="date"
                    class="border rounded px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                    @click="loadStats"
                    class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                >
                    重新整理
                </button>
            </div>
        </div>

        <template v-if="stats">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div class="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
                    <h3 class="text-gray-600 text-sm font-medium mb-2">總訂單數</h3>
                    <p class="text-4xl font-bold text-blue-700">{{ stats.total_orders }}</p>
                </div>
                <div class="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
                    <h3 class="text-gray-600 text-sm font-medium mb-2">總金額</h3>
                    <p class="text-4xl font-bold text-green-700">${{ stats.total_price }}</p>
                </div>
            </div>

            <div class="space-y-8">
                <p v-if="stats.vendors.length === 0" class="text-gray-500 text-center py-8">此日期尚無訂單</p>
                <div
                    v-else
                    v-for="vendor in stats.vendors"
                    :key="vendor.name"
                    class="border rounded-lg overflow-hidden"
                >
                    <div class="bg-gray-50 p-4 border-b flex justify-between items-center">
                        <h3 class="text-lg font-bold text-gray-800">{{ vendor.name }}</h3>
                        <div class="text-sm text-gray-600">
                            <span class="mr-4">數量: {{ vendor.total_orders }}</span>
                            <span class="font-bold text-green-700">總額: ${{ vendor.total_price }}</span>
                        </div>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full">
                            <thead>
                                <tr class="bg-white border-b text-sm text-gray-500">
                                    <th class="text-left p-3 font-medium">品項</th>
                                    <th class="text-right p-3 font-medium">數量</th>
                                    <th class="text-right p-3 font-medium">小計</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr
                                    v-for="item in vendor.items"
                                    :key="item.name"
                                    class="border-b last:border-0 hover:bg-gray-50"
                                >
                                    <td class="p-3 text-gray-800">
                                        {{ item.description ? `${item.description} (${item.name})` : item.name }}
                                    </td>
                                    <td class="p-3 text-right font-medium">{{ item.count }}</td>
                                    <td class="p-3 text-right text-gray-600">${{ item.subtotal }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>
