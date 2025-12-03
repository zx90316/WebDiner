<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import Loading from '@/components/Loading.vue'
import LoadingButton from '@/components/LoadingButton.vue'

interface Vendor {
    id: number
    name: string
}

interface VendorMenuItem {
    id: number
    vendor_id: number
    name: string
    description: string
    price: number
    weekday: number | null
    is_active: boolean
}

const WEEKDAYS = ['週一', '週二', '週三', '週四', '週五', '週六', '週日']

const authStore = useAuthStore()
const toastStore = useToastStore()

const vendors = ref<Vendor[]>([])
const selectedVendor = ref<number | null>(null)
const menuItems = ref<VendorMenuItem[]>([])
const loading = ref(false)
const submitting = ref(false)
const editingId = ref<number | null>(null)

const formData = reactive({
    name: '',
    description: '',
    price: '',
    weekday: '',
})

const allDayItems = computed(() => menuItems.value.filter(item => item.weekday === null))
const groupedItems = computed(() => WEEKDAYS.map((day, index) => ({
    day,
    items: menuItems.value.filter(item => item.weekday === index),
})))

const loadVendors = async () => {
    try {
        const data = await api.get('/vendors/', authStore.token!)
        vendors.value = data
        if (data.length > 0) {
            selectedVendor.value = data[0].id
        }
    } catch {
        toastStore.showToast('載入廠商列表失敗', 'error')
    }
}

const loadMenuItems = async () => {
    if (!selectedVendor.value) return
    try {
        loading.value = true
        const data = await api.get(`/vendors/${selectedVendor.value}/menu`, authStore.token!)
        menuItems.value = data
    } catch {
        toastStore.showToast('載入菜單失敗', 'error')
    } finally {
        loading.value = false
    }
}

const handleSubmit = async () => {
    if (!formData.name || !formData.price) {
        toastStore.showToast('請填寫所有必填欄位', 'error')
        return
    }

    if (formData.weekday !== '' && !formData.description) {
        toastStore.showToast('設定特定供應日期時，描述欄位為必填', 'error')
        return
    }

    if (!selectedVendor.value) {
        toastStore.showToast('請先選擇廠商', 'error')
        return
    }

    try {
        submitting.value = true
        const payload = {
            name: formData.name,
            description: formData.description,
            price: parseInt(formData.price),
            weekday: formData.weekday === '' ? null : parseInt(formData.weekday),
            is_active: true,
        }

        if (editingId.value) {
            await api.put(`/vendors/${selectedVendor.value}/menu/${editingId.value}`, payload, authStore.token!)
            toastStore.showToast('品項已更新', 'success')
        } else {
            await api.post(`/vendors/${selectedVendor.value}/menu`, payload, authStore.token!)
            toastStore.showToast('品項已新增', 'success')
        }

        formData.name = ''
        formData.description = ''
        formData.price = ''
        formData.weekday = ''
        editingId.value = null
        loadMenuItems()
    } catch (error: any) {
        toastStore.showToast(error.message || '操作失敗', 'error')
    } finally {
        submitting.value = false
    }
}

const handleEdit = (item: VendorMenuItem) => {
    formData.name = item.name
    formData.description = item.description
    formData.price = item.price.toString()
    formData.weekday = item.weekday === null ? '' : item.weekday.toString()
    editingId.value = item.id
}

const handleDelete = async (id: number, name: string) => {
    if (!confirm(`確定要刪除「${name}」嗎？`)) {
        return
    }

    try {
        await api.delete(`/vendors/${selectedVendor.value}/menu/${id}`, authStore.token!)
        toastStore.showToast('品項已刪除', 'success')
        loadMenuItems()
    } catch (error: any) {
        toastStore.showToast(error.message || '刪除失敗', 'error')
    }
}

const cancelEdit = () => {
    formData.name = ''
    formData.description = ''
    formData.price = ''
    formData.weekday = ''
    editingId.value = null
}

watch(selectedVendor, () => {
    loadMenuItems()
})

onMounted(() => {
    loadVendors()
})
</script>

<template>
    <div class="bg-white p-6 rounded-lg shadow">
        <h2 class="text-2xl font-bold mb-6">廠商菜單設定</h2>

        <div class="mb-6">
            <label class="block text-gray-700 mb-2 font-medium">選擇廠商</label>
            <select
                v-model="selectedVendor"
                class="w-full md:w-1/2 p-2 border rounded focus:ring-2 focus:ring-blue-500"
            >
                <option v-for="vendor in vendors" :key="vendor.id" :value="vendor.id">
                    {{ vendor.name }}
                </option>
            </select>
        </div>

        <form class="mb-8 bg-gray-50 p-6 rounded-lg border" @submit.prevent="handleSubmit">
            <h3 class="font-bold mb-4 text-lg">
                {{ editingId ? '編輯品項' : '新增品項' }}
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-gray-700 mb-2 font-medium">
                        品項名稱 <span class="text-red-500">*</span>
                    </label>
                    <input
                        v-model="formData.name"
                        placeholder="例：漢堡、葷食便當"
                        class="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div>
                <div>
                    <label class="block text-gray-700 mb-2 font-medium">
                        價格 (元) <span class="text-red-500">*</span>
                    </label>
                    <input
                        v-model="formData.price"
                        type="number"
                        min="0"
                        placeholder="100"
                        class="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div>
                <div>
                    <label class="block text-gray-700 mb-2 font-medium">供應日期</label>
                    <select
                        v-model="formData.weekday"
                        class="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">每天供應</option>
                        <option v-for="(day, index) in WEEKDAYS" :key="index" :value="index">
                            {{ day }}
                        </option>
                    </select>
                </div>
                <div>
                    <label class="block text-gray-700 mb-2 font-medium">
                        描述 <span v-if="formData.weekday !== ''" class="text-red-500">*</span>
                    </label>
                    <input
                        v-model="formData.description"
                        :placeholder="formData.weekday !== '' ? '品項描述（設定供應日期時必填）' : '品項描述（選填）'"
                        :class="[
                            'w-full p-2 border rounded focus:ring-2 focus:ring-blue-500',
                            formData.weekday !== '' && !formData.description ? 'border-orange-300' : ''
                        ]"
                        :required="formData.weekday !== ''"
                    />
                </div>
            </div>
            <div class="flex gap-2 mt-4">
                <LoadingButton
                    type="submit"
                    :loading="submitting"
                    class="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600"
                >
                    {{ editingId ? '更新品項' : '新增品項' }}
                </LoadingButton>
                <button
                    v-if="editingId"
                    type="button"
                    class="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
                    @click="cancelEdit"
                >
                    取消編輯
                </button>
            </div>
        </form>

        <Loading v-if="loading" />
        <div v-else class="space-y-6">
            <div v-if="allDayItems.length > 0">
                <h3 class="font-bold text-lg mb-3">📅 每天供應</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div v-for="item in allDayItems" :key="item.id" class="border p-4 rounded bg-blue-50">
                        <div class="flex justify-between items-start">
                            <div class="flex-1">
                                <h4 class="font-bold">{{ item.name }}</h4>
                                <p v-if="item.description" class="text-sm text-gray-600">{{ item.description }}</p>
                                <p class="text-green-600 font-medium mt-1">${{ item.price }}</p>
                            </div>
                            <div class="flex gap-2">
                                <button class="text-blue-600 hover:text-blue-800 text-sm" @click="handleEdit(item)">編輯</button>
                                <button class="text-red-600 hover:text-red-800 text-sm" @click="handleDelete(item.id, item.name)">刪除</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <template v-for="({ day, items }, dayIndex) in groupedItems" :key="dayIndex">
                <div v-if="items.length > 0">
                    <h3 class="font-bold text-lg mb-3">{{ day }}</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div v-for="item in items" :key="item.id" class="border p-4 rounded bg-gray-50">
                            <div class="flex justify-between items-start">
                                <div class="flex-1">
                                    <h4 class="font-bold">{{ item.name }}</h4>
                                    <p v-if="item.description" class="text-sm text-gray-600">{{ item.description }}</p>
                                    <p class="text-green-600 font-medium mt-1">${{ item.price }}</p>
                                </div>
                                <div class="flex gap-2">
                                    <button class="text-blue-600 hover:text-blue-800 text-sm" @click="handleEdit(item)">編輯</button>
                                    <button class="text-red-600 hover:text-red-800 text-sm" @click="handleDelete(item.id, item.name)">刪除</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </template>

            <div v-if="menuItems.length === 0" class="text-center text-gray-500 py-8">
                <p>此廠商尚未設定菜單</p>
            </div>
        </div>
    </div>
</template>

