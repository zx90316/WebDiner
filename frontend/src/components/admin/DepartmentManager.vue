<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import Loading from '@/components/Loading.vue'
import LoadingButton from '@/components/LoadingButton.vue'

interface Division {
    id: number
    name: string
    is_active: boolean
    display_order: number
}

interface Department {
    id: number
    name: string
    is_active: boolean
    division_id: number | null
    display_column: number
    display_order: number
}

const authStore = useAuthStore()
const toastStore = useToastStore()

const departments = ref<Department[]>([])
const divisions = ref<Division[]>([])
const loading = ref(true)
const submitting = ref(false)
const editingId = ref<number | null>(null)

const newDept = reactive({
    name: '',
    division_id: null as number | null,
    display_column: 0,
    display_order: 0,
})

const loadData = async () => {
    try {
        loading.value = true
        const [deptData, divData] = await Promise.all([
            api.get('/admin/departments', authStore.token!),
            api.get('/admin/divisions', authStore.token!),
        ])
        departments.value = deptData
        divisions.value = divData
    } catch {
        toastStore.showToast('載入資料失敗', 'error')
    } finally {
        loading.value = false
    }
}

const handleSubmit = async () => {
    if (!newDept.name.trim()) {
        toastStore.showToast('請輸入部門名稱', 'error')
        return
    }
    try {
        submitting.value = true
        await api.post('/admin/departments', newDept, authStore.token!)
        toastStore.showToast('部門已新增', 'success')
        newDept.name = ''
        newDept.division_id = null
        newDept.display_column = 0
        newDept.display_order = 0
        loadData()
    } catch (error: any) {
        toastStore.showToast(error.message || '操作失敗', 'error')
    } finally {
        submitting.value = false
    }
}

const handleDelete = async (id: number, name: string) => {
    if (!confirm(`確定要刪除「${name}」嗎？`)) return
    try {
        await api.delete(`/admin/departments/${id}`, authStore.token!)
        toastStore.showToast('部門已刪除', 'success')
        loadData()
    } catch (error: any) {
        toastStore.showToast(error.message || '刪除失敗', 'error')
    }
}

const getDivisionName = (divisionId: number | null) => {
    if (!divisionId) return '未分類'
    return divisions.value.find(d => d.id === divisionId)?.name || '未分類'
}

onMounted(() => {
    loadData()
})
</script>

<template>
    <Loading v-if="loading" />
    <div v-else class="space-y-6">
        <div class="bg-white p-6 rounded-lg shadow">
            <h2 class="text-xl font-bold mb-4">新增部門</h2>
            <form class="flex flex-wrap gap-4 items-end" @submit.prevent="handleSubmit">
                <div class="flex-1 min-w-[200px]">
                    <label class="block text-sm font-medium text-gray-700 mb-1">部門名稱</label>
                    <input
                        v-model="newDept.name"
                        type="text"
                        placeholder="例如：行政服務部"
                        class="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div class="w-48">
                    <label class="block text-sm font-medium text-gray-700 mb-1">所屬處別</label>
                    <select
                        v-model="newDept.division_id"
                        class="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                    >
                        <option :value="null">-- 請選擇 --</option>
                        <option v-for="div in divisions" :key="div.id" :value="div.id">{{ div.name }}</option>
                    </select>
                </div>
                <div class="w-32">
                    <label class="block text-sm font-medium text-gray-700 mb-1">顯示欄位</label>
                    <select
                        v-model="newDept.display_column"
                        class="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                    >
                        <option :value="0">第一欄</option>
                        <option :value="1">第二欄</option>
                        <option :value="2">第三欄</option>
                        <option :value="3">第四欄</option>
                    </select>
                </div>
                <div class="w-24">
                    <label class="block text-sm font-medium text-gray-700 mb-1">排序</label>
                    <input
                        v-model.number="newDept.display_order"
                        type="number"
                        min="0"
                        class="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <LoadingButton
                    type="submit"
                    :loading="submitting"
                    class="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 transition h-[42px]"
                >
                    新增
                </LoadingButton>
            </form>
        </div>

        <div class="bg-white p-6 rounded-lg shadow">
            <h2 class="text-xl font-bold mb-4">部門列表</h2>
            <div class="overflow-x-auto">
                <table class="w-full">
                    <thead>
                        <tr class="bg-gray-100 border-b">
                            <th class="text-left p-3 font-semibold">部門名稱</th>
                            <th class="text-left p-3 font-semibold">所屬處別</th>
                            <th class="text-center p-3 font-semibold">顯示欄位</th>
                            <th class="text-center p-3 font-semibold">排序</th>
                            <th class="text-center p-3 font-semibold">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="dept in departments" :key="dept.id" class="border-b hover:bg-gray-50">
                            <td class="p-3 font-medium">{{ dept.name }}</td>
                            <td class="p-3">{{ getDivisionName(dept.division_id) }}</td>
                            <td class="p-3 text-center">第 {{ dept.display_column + 1 }} 欄</td>
                            <td class="p-3 text-center">{{ dept.display_order }}</td>
                            <td class="p-3 text-center">
                                <button
                                    class="text-red-600 hover:text-red-800"
                                    @click="handleDelete(dept.id, dept.name)"
                                >
                                    刪除
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</template>

