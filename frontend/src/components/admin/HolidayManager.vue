<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import Loading from '@/components/Loading.vue'

interface SpecialDay {
    id: number
    date: string
    is_holiday: boolean
    description: string
}

const authStore = useAuthStore()
const toastStore = useToastStore()

const specialDays = ref<SpecialDay[]>([])
const loading = ref(true)
const newDate = ref('')
const newDescription = ref('')
const isHoliday = ref(true)

const loadSpecialDays = async () => {
    try {
        loading.value = true
        const data = await api.get('/orders/special_days', authStore.token!)
        specialDays.value = data
    } catch {
        toastStore.showToast('載入節假日失敗', 'error')
    } finally {
        loading.value = false
    }
}

const handleAdd = async () => {
    if (!newDate.value) {
        toastStore.showToast('請選擇日期', 'error')
        return
    }

    try {
        await api.post('/orders/special_days', {
            date: newDate.value,
            is_holiday: isHoliday.value,
            description: newDescription.value,
        }, authStore.token!)
        toastStore.showToast('已新增', 'success')
        newDate.value = ''
        newDescription.value = ''
        loadSpecialDays()
    } catch (error: any) {
        toastStore.showToast(error.message || '新增失敗', 'error')
    }
}

const handleDelete = async (id: number) => {
    if (!confirm('確定要刪除嗎？')) return
    try {
        await api.delete(`/orders/special_days/${id}`, authStore.token!)
        toastStore.showToast('已刪除', 'success')
        loadSpecialDays()
    } catch (error: any) {
        toastStore.showToast(error.message || '刪除失敗', 'error')
    }
}

onMounted(() => {
    loadSpecialDays()
})
</script>

<template>
    <Loading v-if="loading" />
    <div v-else class="bg-white p-6 rounded-lg shadow">
        <h2 class="text-2xl font-bold mb-6">節假日管理</h2>

        <div class="mb-8 bg-gray-50 p-6 rounded-lg border">
            <h3 class="font-bold mb-4 text-lg">新增特殊日期</h3>
            <div class="flex flex-wrap gap-4 items-end">
                <div>
                    <label class="block text-gray-700 mb-2 font-medium">日期</label>
                    <input
                        v-model="newDate"
                        type="date"
                        class="p-2 border rounded focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div>
                    <label class="block text-gray-700 mb-2 font-medium">類型</label>
                    <select v-model="isHoliday" class="p-2 border rounded focus:ring-2 focus:ring-blue-500">
                        <option :value="true">假日（不供餐）</option>
                        <option :value="false">補班日（供餐）</option>
                    </select>
                </div>
                <div class="flex-1">
                    <label class="block text-gray-700 mb-2 font-medium">描述</label>
                    <input
                        v-model="newDescription"
                        placeholder="例：中秋節、補班"
                        class="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <button
                    class="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 transition"
                    @click="handleAdd"
                >
                    新增
                </button>
            </div>
        </div>

        <div class="overflow-x-auto">
            <table class="w-full">
                <thead>
                    <tr class="bg-gray-100 border-b">
                        <th class="text-left p-3 font-semibold">日期</th>
                        <th class="text-center p-3 font-semibold">類型</th>
                        <th class="text-left p-3 font-semibold">描述</th>
                        <th class="text-center p-3 font-semibold">操作</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="day in specialDays" :key="day.id" class="border-b hover:bg-gray-50">
                        <td class="p-3">{{ day.date }}</td>
                        <td class="p-3 text-center">
                            <span :class="day.is_holiday ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'" class="px-2 py-1 rounded text-sm">
                                {{ day.is_holiday ? '假日' : '補班日' }}
                            </span>
                        </td>
                        <td class="p-3">{{ day.description || '-' }}</td>
                        <td class="p-3 text-center">
                            <button class="text-red-600 hover:text-red-800" @click="handleDelete(day.id)">刪除</button>
                        </td>
                    </tr>
                    <tr v-if="specialDays.length === 0">
                        <td colspan="4" class="p-8 text-center text-gray-500">尚無特殊日期設定</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

