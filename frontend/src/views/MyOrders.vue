<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '@/lib/api'
import * as timeService from '@/lib/timeService'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import Loading from '@/components/Loading.vue'

interface Order {
    id: number
    user_id: number
    vendor_id: number
    vendor_menu_item_id: number
    order_date: string
    created_at: string
    status: string
    vendor_name: string
    menu_item_name: string
    menu_item_price: number
}

const authStore = useAuthStore()
const toastStore = useToastStore()
const orders = ref<Order[]>([])
const loading = ref(true)

const loadOrders = async () => {
    try {
        loading.value = true
        const data = await api.get('/orders/', authStore.token!)
        orders.value = data
    } catch (error) {
        toastStore.showToast('載入訂單失敗', 'error')
    } finally {
        loading.value = false
    }
}

const cancelOrder = async (orderId: number, orderDate: string) => {
    if (!timeService.canCancelOrder(orderDate)) {
        toastStore.showToast('只能在訂單當天 9:00 前取消訂單', 'error')
        return
    }

    if (!confirm('確定要取消這個訂單嗎？')) {
        return
    }

    try {
        await api.delete(`/orders/${orderId}`, authStore.token!)
        toastStore.showToast('訂單已取消', 'success')
        loadOrders()
    } catch (error: any) {
        toastStore.showToast(error.message || '取消訂單失敗', 'error')
    }
}

const canCancel = (orderDate: string) => {
    return timeService.canCancelOrder(orderDate)
}

onMounted(() => {
    loadOrders()
})
</script>

<template>
    <Loading v-if="loading" full-screen />
    <div v-else class="min-h-screen bg-gray-50 py-8">
        <div class="container mx-auto px-4">
            <h1 class="text-3xl font-bold mb-6">我的訂單</h1>

            <div v-if="orders.length === 0" class="text-center text-gray-500 py-12 bg-white rounded-lg shadow">
                <p class="text-lg">尚無訂單</p>
                <p class="text-sm mt-2">前往訂餐頁面開始訂餐</p>
            </div>

            <div v-else class="space-y-4">
                <div v-for="order in orders" :key="order.id" class="bg-white p-6 rounded-lg shadow">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <h3 class="text-lg font-bold">訂單 #{{ order.id }}</h3>
                            <p class="text-gray-600">訂餐日期: {{ order.order_date }}</p>
                            <p class="text-sm text-gray-500">
                                建立時間: {{ new Date(order.created_at).toLocaleString('zh-TW') }}
                            </p>
                        </div>
                        <div class="flex items-center gap-3">
                            <span
                                :class="[
                                    'px-3 py-1 rounded',
                                    order.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                                    order.status === 'Completed' ? 'bg-green-100 text-green-800' :
                                    'bg-gray-100 text-gray-800'
                                ]"
                            >
                                {{ order.status === 'Pending' ? '待處理' : order.status === 'Confirmed' ? '已完成' : '已取消' }}
                            </span>
                            <button
                                v-if="canCancel(order.order_date) && order.status === 'Pending'"
                                class="text-red-600 hover:text-red-800 text-sm font-medium"
                                @click="cancelOrder(order.id, order.order_date)"
                            >
                                取消訂單
                            </button>
                        </div>
                    </div>

                    <div class="border-t pt-4">
                        <h4 class="font-semibold mb-3 text-gray-700">訂單內容</h4>
                        <div class="bg-gray-50 p-4 rounded-lg">
                            <div class="flex justify-between items-center">
                                <div>
                                    <p class="font-bold text-lg">{{ order.vendor_name }}</p>
                                    <p class="text-gray-700">{{ order.menu_item_name }}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

