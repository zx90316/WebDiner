<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import Loading from '@/components/Loading.vue'

// Helper for date formatting
const getTodayString = () => {
    const d = new Date()
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

interface OrderDetail {
    user_id: number
    employee_id: string
    name: string
    department: string
    order_id: number | null
    item_name: string
    vendor_name: string
    vendor_color: string
    vendor_id: number | null
    item_id: number | null
}

interface VendorMenuItem {
    id: number
    name: string
    description: string
    price: number
}

interface Vendor {
    id: number
    name: string
    description: string
    color: string
}

interface AvailableVendor {
    vendor: Vendor
    menu_items: VendorMenuItem[]
}

const authStore = useAuthStore()
const toastStore = useToastStore()

const date = ref(getTodayString())
const orders = ref<OrderDetail[]>([])
const loading = ref(true)

// Edit Modal State
const editingUser = ref<OrderDetail | null>(null)
const availableVendors = ref<AvailableVendor[]>([])
const loadingVendors = ref(false)

const loadOrders = async () => {
    try {
        loading.value = true
        const data = await api.get(`/admin/orders/daily_details?date=${date.value}`, authStore.token!)
        orders.value = data
    } catch {
        toastStore.showToast('載入訂單資料失敗', 'error')
    } finally {
        loading.value = false
    }
}

const handleEditClick = async (order: OrderDetail) => {
    editingUser.value = order
    try {
        loadingVendors.value = true
        const data = await api.get(`/vendors/available/${date.value}`, authStore.token!)
        availableVendors.value = data
    } catch {
        toastStore.showToast('載入廠商資料失敗', 'error')
    } finally {
        loadingVendors.value = false
    }
}

const handleCloseModal = () => {
    editingUser.value = null
    availableVendors.value = []
}

const handleSelectNoOrder = async () => {
    if (!editingUser.value) return
    try {
        await api.put('/admin/orders/user_order', {
            user_id: editingUser.value.user_id,
            order_date: date.value,
            is_cancel: true
        }, authStore.token!)
        toastStore.showToast('已取消訂單', 'success')
        handleCloseModal()
        loadOrders()
    } catch (error: any) {
        toastStore.showToast(error.message || '操作失敗', 'error')
    }
}

const handleSelectItem = async (vendorId: number, itemId: number) => {
    if (!editingUser.value) return
    try {
        await api.put('/admin/orders/user_order', {
            user_id: editingUser.value.user_id,
            order_date: date.value,
            vendor_id: vendorId,
            item_id: itemId,
            is_cancel: false
        }, authStore.token!)
        toastStore.showToast('訂單已更新', 'success')
        handleCloseModal()
        loadOrders()
    } catch (error: any) {
        toastStore.showToast(error.message || '操作失敗', 'error')
    }
}

// 展平廠商菜單項目
const flattenedItems = () => {
    return availableVendors.value.flatMap(v =>
        v.menu_items.map(item => ({ vendor: v.vendor, item }))
    )
}

watch(date, () => {
    loadOrders()
})

onMounted(() => {
    loadOrders()
})
</script>

<template>
    <div class="bg-white p-6 rounded-lg shadow">
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold">人員訂餐設定</h2>
            <div class="flex items-center gap-2">
                <label class="font-medium text-gray-700">選擇日期：</label>
                <input
                    v-model="date"
                    type="date"
                    class="p-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
            </div>
        </div>

        <Loading v-if="loading" />
        <div v-else class="overflow-x-auto">
            <table class="w-full">
                <thead>
                    <tr class="bg-gray-100 border-b">
                        <th class="text-left p-3 font-semibold">工號</th>
                        <th class="text-left p-3 font-semibold">姓名</th>
                        <th class="text-left p-3 font-semibold">部門</th>
                        <th class="text-left p-3 font-semibold">餐點</th>
                        <th class="text-center p-3 font-semibold">操作</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="order in orders" :key="order.user_id" class="border-b hover:bg-gray-50">
                        <td class="p-3 font-medium">{{ order.employee_id }}</td>
                        <td class="p-3">{{ order.name }}</td>
                        <td class="p-3">{{ order.department || '-' }}</td>
                        <td class="p-3">
                            <div v-if="order.item_name !== '未選'" class="flex items-center gap-2">
                                <div
                                    class="w-3 h-3 rounded-full"
                                    :style="{ backgroundColor: order.vendor_color || '#ccc' }"
                                />
                                <span>{{ order.item_name }}</span>
                                <span class="text-xs text-gray-500">({{ order.vendor_name }})</span>
                            </div>
                            <span v-else class="text-gray-400">未選</span>
                        </td>
                        <td class="p-3 text-center">
                            <button
                                @click="handleEditClick(order)"
                                class="text-blue-600 hover:text-blue-800 font-medium"
                            >
                                編輯
                            </button>
                        </td>
                    </tr>
                    <tr v-if="orders.length === 0">
                        <td colspan="5" class="p-8 text-center text-gray-500">尚無人員訂餐資料</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Edit Modal -->
        <Teleport to="body">
            <div v-if="editingUser" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                    <div class="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
                        <h3 class="text-xl font-bold">
                            編輯訂單 - {{ editingUser.name }} ({{ editingUser.employee_id }})
                        </h3>
                        <button
                            @click="handleCloseModal"
                            class="text-gray-500 hover:text-gray-700 text-2xl"
                        >
                            &times;
                        </button>
                    </div>

                    <div class="p-6">
                        <Loading v-if="loadingVendors" />
                        <div v-else class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <!-- No Order Button -->
                            <button
                                @click="handleSelectNoOrder"
                                class="w-full text-left p-3 bg-gray-50 border border-gray-200 text-gray-600 rounded hover:bg-gray-100 transition-all shadow-sm flex flex-col justify-center min-h-[80px]"
                            >
                                <div class="font-bold text-center w-full">取消/未選</div>
                            </button>

                            <!-- Vendor Items -->
                            <button
                                v-for="{ vendor, item } in flattenedItems()"
                                :key="`${vendor.id}-${item.id}`"
                                @click="handleSelectItem(vendor.id, item.id)"
                                class="w-full text-left p-3 bg-white border text-gray-800 rounded hover:opacity-80 transition-all shadow-sm group flex flex-col justify-between min-h-[80px]"
                                :style="{ borderColor: vendor.color || '#BFDBFE', borderLeftWidth: '4px' }"
                            >
                                <div class="font-bold text-sm line-clamp-2 mb-1">
                                    {{ item.name }}
                                </div>
                                <div class="text-xs text-gray-500 truncate">
                                    {{ vendor.name }}
                                </div>
                            </button>
                        </div>

                        <div v-if="availableVendors.length === 0 && !loadingVendors" class="text-center text-gray-500 py-8">
                            今日無可選廠商
                        </div>
                    </div>
                </div>
            </div>
        </Teleport>
    </div>
</template>
