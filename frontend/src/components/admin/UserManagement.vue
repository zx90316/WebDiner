<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import Loading from '@/components/Loading.vue'
import LoadingButton from '@/components/LoadingButton.vue'

interface User {
    id: number
    employee_id: string
    name: string
    department_id: number
    extension: string
    email: string
    is_admin: boolean
    role: string
    is_active: boolean
    title: string | null
    is_department_head: boolean
}

interface Department {
    id: number
    name: string
}

const authStore = useAuthStore()
const toastStore = useToastStore()

const users = ref<User[]>([])
const departments = ref<Department[]>([])
const loading = ref(true)
const submitting = ref(false)
const editingId = ref<number | null>(null)

const isSysAdmin = authStore.isSysAdmin

const formData = reactive({
    employee_id: '',
    name: '',
    department_id: '' as number | '',
    extension: '',
    email: '',
    password: '',
    role: 'user',
    title: '',
    is_department_head: false,
})

const loadData = async () => {
    try {
        loading.value = true
        const [usersData, deptsData] = await Promise.all([
            api.get('/admin/users', authStore.token!),
            api.get('/admin/departments', authStore.token!)
        ])
        users.value = usersData
        departments.value = deptsData
    } catch {
        toastStore.showToast('載入資料失敗', 'error')
    } finally {
        loading.value = false
    }
}

const handleSubmit = async () => {
    if (!formData.employee_id || !formData.name) {
        toastStore.showToast('請填寫必填欄位（工號、姓名）', 'error')
        return
    }

    try {
        submitting.value = true
        const payload: any = {
            employee_id: formData.employee_id,
            name: formData.name,
            department_id: formData.department_id ? Number(formData.department_id) : null,
            extension: formData.extension || null,
            email: formData.email || null,
            role: formData.role,
            title: formData.title || null,
            is_department_head: formData.is_department_head,
        }

        if (formData.password) {
            payload.password = formData.password
        }

        if (editingId.value) {
            await api.put(`/admin/users/${editingId.value}`, payload, authStore.token!)
            toastStore.showToast('人員已更新', 'success')
        } else {
            if (!formData.password) {
                toastStore.showToast('新增人員時必須設定密碼', 'error')
                submitting.value = false
                return
            }
            await api.post('/admin/users', payload, authStore.token!)
            toastStore.showToast('人員已新增', 'success')
        }

        resetForm()
        loadData()
    } catch (error: any) {
        toastStore.showToast(error.message || '操作失敗', 'error')
    } finally {
        submitting.value = false
    }
}

const handleEdit = (user: User) => {
    if (!isSysAdmin && (user.role === 'admin' || user.role === 'sysadmin')) {
        toastStore.showToast('您沒有權限編輯此管理員帳號', 'error')
        return
    }

    formData.employee_id = user.employee_id
    formData.name = user.name
    formData.department_id = user.department_id || ''
    formData.extension = user.extension || ''
    formData.email = user.email || ''
    formData.password = ''
    formData.role = user.role || 'user'
    formData.title = user.title || ''
    formData.is_department_head = user.is_department_head || false
    editingId.value = user.id
}

const handleDelete = async (id: number, name: string, role: string) => {
    if (!isSysAdmin && (role === 'admin' || role === 'sysadmin')) {
        toastStore.showToast('您沒有權限刪除此管理員帳號', 'error')
        return
    }

    if (!confirm(`確定要刪除「${name}」嗎？`)) {
        return
    }

    try {
        await api.delete(`/admin/users/${id}`, authStore.token!)
        toastStore.showToast('人員已刪除', 'success')
        loadData()
    } catch (error: any) {
        toastStore.showToast(error.message || '刪除失敗', 'error')
    }
}

const resetForm = () => {
    formData.employee_id = ''
    formData.name = ''
    formData.department_id = ''
    formData.extension = ''
    formData.email = ''
    formData.password = ''
    formData.role = 'user'
    formData.title = ''
    formData.is_department_head = false
    editingId.value = null
}

onMounted(() => {
    loadData()
})
</script>

<template>
    <Loading v-if="loading" />
    <div v-else class="bg-white p-6 rounded-lg shadow">
        <h2 class="text-2xl font-bold mb-6">用戶管理</h2>

        <form class="mb-8 bg-gray-50 p-6 rounded-lg border" @submit.prevent="handleSubmit">
            <h3 class="font-bold mb-4 text-lg">
                {{ editingId ? '編輯人員' : '新增人員' }}
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-gray-700 mb-2 font-medium">
                        工號 <span class="text-red-500">*</span>
                    </label>
                    <input
                        v-model="formData.employee_id"
                        class="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div>
                <div>
                    <label class="block text-gray-700 mb-2 font-medium">
                        姓名 <span class="text-red-500">*</span>
                    </label>
                    <input
                        v-model="formData.name"
                        class="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div>
                <div>
                    <label class="block text-gray-700 mb-2 font-medium">部門</label>
                    <select
                        v-model="formData.department_id"
                        class="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">請選擇部門</option>
                        <option v-for="dept in departments" :key="dept.id" :value="dept.id">{{ dept.name }}</option>
                    </select>
                </div>
                <div>
                    <label class="block text-gray-700 mb-2 font-medium">分機</label>
                    <input
                        v-model="formData.extension"
                        class="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div>
                    <label class="block text-gray-700 mb-2 font-medium">職稱</label>
                    <input
                        v-model="formData.title"
                        placeholder="例如：經理、副理、主任"
                        class="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div>
                    <label class="block text-gray-700 mb-2 font-medium">Email</label>
                    <input
                        v-model="formData.email"
                        type="email"
                        class="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div class="flex items-center">
                    <label class="flex items-center cursor-pointer">
                        <input
                            v-model="formData.is_department_head"
                            type="checkbox"
                            class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span class="ml-2 text-gray-700 font-medium">部門主管</span>
                    </label>
                </div>
                <div v-if="!editingId || isSysAdmin">
                    <label class="block text-gray-700 mb-2 font-medium">
                        密碼 <span v-if="editingId" class="text-gray-500 text-sm">(若不修改請留空)</span>
                    </label>
                    <input
                        v-model="formData.password"
                        type="password"
                        class="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                        :required="!editingId"
                    />
                </div>
                <div v-if="isSysAdmin">
                    <label class="block text-gray-700 mb-2 font-medium">角色權限</label>
                    <select
                        v-model="formData.role"
                        class="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="user">一般用戶</option>
                        <option value="admin">管理員</option>
                        <option value="sysadmin">系統管理員</option>
                    </select>
                </div>
            </div>
            <div class="flex gap-2 mt-4">
                <LoadingButton
                    type="submit"
                    :loading="submitting"
                    class="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 transition"
                >
                    {{ editingId ? '更新人員' : '新增人員' }}
                </LoadingButton>
                <button
                    v-if="editingId"
                    type="button"
                    class="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600 transition"
                    @click="resetForm"
                >
                    取消編輯
                </button>
            </div>
        </form>

        <div class="overflow-x-auto">
            <table class="w-full">
                <thead>
                    <tr class="bg-gray-100 border-b">
                        <th class="text-left p-3 font-semibold">工號</th>
                        <th class="text-left p-3 font-semibold">姓名</th>
                        <th class="text-left p-3 font-semibold">職稱</th>
                        <th class="text-left p-3 font-semibold">部門</th>
                        <th class="text-left p-3 font-semibold">分機</th>
                        <th class="text-center p-3 font-semibold">權限</th>
                        <th class="text-center p-3 font-semibold">操作</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="user in users" :key="user.id" class="border-b hover:bg-gray-50">
                        <td class="p-3 font-medium">{{ user.employee_id }}</td>
                        <td class="p-3">{{ user.name }}</td>
                        <td class="p-3">{{ user.title || '-' }}</td>
                        <td class="p-3">{{ departments.find(d => d.id === user.department_id)?.name || '-' }}</td>
                        <td class="p-3">{{ user.extension || '-' }}</td>
                        <td class="p-3 text-center">
                            <span v-if="user.role === 'sysadmin'" class="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">系統管理員</span>
                            <span v-else-if="user.role === 'admin'" class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">管理員</span>
                            <span v-else class="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">一般</span>
                        </td>
                        <td class="p-3 text-center">
                            <template v-if="isSysAdmin || (user.role !== 'admin' && user.role !== 'sysadmin')">
                                <button class="text-blue-600 hover:text-blue-800 mr-3" @click="handleEdit(user)">編輯</button>
                                <button class="text-red-600 hover:text-red-800" @click="handleDelete(user.id, user.name, user.role)">刪除</button>
                            </template>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

