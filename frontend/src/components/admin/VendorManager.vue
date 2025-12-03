<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import Loading from '@/components/Loading.vue'
import LoadingButton from '@/components/LoadingButton.vue'

interface Vendor {
    id: number
    name: string
    description: string
    color: string
    is_active: boolean
}

const authStore = useAuthStore()
const toastStore = useToastStore()

const vendors = ref<Vendor[]>([])
const loading = ref(true)
const submitting = ref(false)
const editingId = ref<number | null>(null)

const formData = reactive({
    name: '',
    description: '',
    color: '#3B82F6',
})

const loadVendors = async () => {
    try {
        loading.value = true
        const data = await api.get('/vendors/', authStore.token!)
        vendors.value = data
    } catch {
        toastStore.showToast('載入廠商列表失敗', 'error')
    } finally {
        loading.value = false
    }
}

const handleSubmit = async () => {
    if (!formData.name) {
        toastStore.showToast('請輸入廠商名稱', 'error')
        return
    }

    try {
        submitting.value = true
        const payload = {
            name: formData.name,
            description: formData.description,
            color: formData.color,
            is_active: true,
        }

        if (editingId.value) {
            await api.put(`/vendors/${editingId.value}`, payload, authStore.token!)
            toastStore.showToast('廠商已更新', 'success')
        } else {
            await api.post('/vendors/', payload, authStore.token!)
            toastStore.showToast('廠商已新增', 'success')
        }

        formData.name = ''
        formData.description = ''
        formData.color = '#3B82F6'
        editingId.value = null
        loadVendors()
    } catch (error: any) {
        toastStore.showToast(error.message || '操作失敗', 'error')
    } finally {
        submitting.value = false
    }
}

const handleEdit = (vendor: Vendor) => {
    formData.name = vendor.name
    formData.description = vendor.description
    formData.color = vendor.color || '#3B82F6'
    editingId.value = vendor.id
}

const handleDelete = async (id: number, name: string) => {
    if (!confirm(`確定要刪除「${name}」嗎？`)) {
        return
    }

    try {
        await api.delete(`/vendors/${id}`, authStore.token!)
        toastStore.showToast('廠商已刪除', 'success')
        loadVendors()
    } catch (error: any) {
        toastStore.showToast(error.message || '刪除失敗', 'error')
    }
}

const cancelEdit = () => {
    formData.name = ''
    formData.description = ''
    formData.color = '#3B82F6'
    editingId.value = null
}

onMounted(() => {
    loadVendors()
})
</script>

<template>
    <Loading v-if="loading" />
    <div v-else class="bg-white p-6 rounded-lg shadow">
        <h2 class="text-2xl font-bold mb-6">廠商管理</h2>

        <form class="mb-8 bg-gray-50 p-6 rounded-lg border" @submit.prevent="handleSubmit">
            <h3 class="font-bold mb-4 text-lg">
                {{ editingId ? '編輯廠商' : '新增廠商' }}
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-gray-700 mb-2 font-medium">
                        廠商名稱 <span class="text-red-500">*</span>
                    </label>
                    <input
                        v-model="formData.name"
                        placeholder="例：麥當勞、便當店A"
                        class="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                    />
                </div>
                <div>
                    <label class="block text-gray-700 mb-2 font-medium">描述</label>
                    <input
                        v-model="formData.description"
                        placeholder="廠商描述（選填）"
                        class="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <div>
                    <label class="block text-gray-700 mb-2 font-medium">代表色</label>
                    <div class="flex items-center gap-2">
                        <input
                            v-model="formData.color"
                            type="color"
                            class="h-10 w-20 p-1 border rounded cursor-pointer"
                        />
                        <span class="text-gray-500 text-sm">{{ formData.color }}</span>
                    </div>
                </div>
            </div>
            <div class="flex gap-2 mt-4">
                <LoadingButton
                    type="submit"
                    :loading="submitting"
                    class="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 transition"
                >
                    {{ editingId ? '更新廠商' : '新增廠商' }}
                </LoadingButton>
                <button
                    v-if="editingId"
                    type="button"
                    class="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600 transition"
                    @click="cancelEdit"
                >
                    取消編輯
                </button>
            </div>
        </form>

        <div class="overflow-x-auto">
            <table class="w-full">
                <thead>
                    <tr class="bg-gray-100 border-b">
                        <th class="text-left p-3 font-semibold">廠商名稱</th>
                        <th class="text-left p-3 font-semibold">代表色</th>
                        <th class="text-left p-3 font-semibold">描述</th>
                        <th class="text-center p-3 font-semibold">操作</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="vendor in vendors" :key="vendor.id" class="border-b hover:bg-gray-50">
                        <td class="p-3 font-medium">{{ vendor.name }}</td>
                        <td class="p-3">
                            <div class="flex items-center gap-2">
                                <div
                                    class="w-6 h-6 rounded border shadow-sm"
                                    :style="{ backgroundColor: vendor.color || '#3B82F6' }"
                                />
                                <span class="text-xs text-gray-500">{{ vendor.color }}</span>
                            </div>
                        </td>
                        <td class="p-3 text-gray-600">{{ vendor.description || '-' }}</td>
                        <td class="p-3 text-center">
                            <button
                                class="text-blue-600 hover:text-blue-800 mr-3"
                                @click="handleEdit(vendor)"
                            >
                                編輯
                            </button>
                            <button
                                class="text-red-600 hover:text-red-800"
                                @click="handleDelete(vendor.id, vendor.name)"
                            >
                                刪除
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

