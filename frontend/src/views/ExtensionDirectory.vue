<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import Loading from '@/components/Loading.vue'

interface ExtensionUser {
    employee_id: string
    name: string
    extension: string | null
    title: string | null
    is_department_head: boolean
    is_secondary_department: boolean
}

interface ExtensionDepartment {
    id: number
    name: string
    division_id: number | null
    division_name: string | null
    display_order: number
    users: ExtensionUser[]
}

interface ExtensionDivision {
    id: number
    name: string
    display_column: number
    display_order: number
    departments: ExtensionDepartment[]
}

interface ExtensionColumn {
    column_index: number
    divisions: ExtensionDivision[]
}

interface ExtensionDirectoryData {
    columns: ExtensionColumn[]
    generated_at: string
}

const authStore = useAuthStore()
const toastStore = useToastStore()

const data = ref<ExtensionDirectoryData | null>(null)
const loading = ref(true)
const searchTerm = ref('')

const loadDirectory = async () => {
    try {
        loading.value = true
        const result = await api.get('/extension-directory/', authStore.token!)
        data.value = result
    } catch (error: any) {
        toastStore.showToast(error.message || '載入分機表失敗', 'error')
    } finally {
        loading.value = false
    }
}

const filteredData = computed<ExtensionDirectoryData | null>(() => {
    if (!data.value || !searchTerm.value.trim()) return data.value

    const term = searchTerm.value.toLowerCase()

    return {
        ...data.value,
        columns: data.value.columns.map((col) => ({
            ...col,
            divisions: col.divisions
                .map((div) => ({
                    ...div,
                    departments: div.departments
                        .map((dept) => ({
                            ...dept,
                            users: dept.users.filter(
                                (u) =>
                                    u.name.toLowerCase().includes(term) ||
                                    u.extension?.includes(term) ||
                                    u.employee_id.toLowerCase().includes(term) ||
                                    u.title?.toLowerCase().includes(term)
                            ),
                        }))
                        .filter((dept) => dept.users.length > 0 || dept.name.toLowerCase().includes(term)),
                }))
                .filter((div) => div.departments.length > 0 || div.name.toLowerCase().includes(term)),
        })),
    }
})

const highlightText = (text: string | null) => {
    if (!text || !searchTerm.value.trim()) return text
    const regex = new RegExp(`(${searchTerm.value})`, 'gi')
    return text.replace(regex, '<mark class="bg-yellow-200 px-0.5 rounded">$1</mark>')
}

onMounted(() => {
    loadDirectory()
})
</script>

<template>
    <Loading v-if="loading" full-screen />
    <div v-else-if="!data" class="min-h-screen bg-gray-100 flex items-center justify-center">
        <div class="text-gray-500">無法載入分機表資料</div>
    </div>
    <div v-else class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <!-- 頂部標題列 -->
        <div class="bg-white shadow-sm border-b sticky top-0 z-10">
            <div class="container mx-auto px-4 py-4">
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 class="text-2xl font-bold text-gray-800">
                            📞 財團法人車輛安全審驗中心分機表
                        </h1>
                        <p class="text-sm text-gray-500 mt-1">
                            更新時間：{{ new Date(data.generated_at).toLocaleString('zh-TW') }}
                        </p>
                    </div>
                    <div class="flex items-center gap-4">
                        <div class="relative">
                            <input
                                v-model="searchTerm"
                                type="text"
                                placeholder="搜尋姓名、分機、工號..."
                                class="pl-10 pr-4 py-2 border rounded-lg w-64 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                🔍
                            </span>
                            <button
                                v-if="searchTerm"
                                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                @click="searchTerm = ''"
                            >
                                ✕
                            </button>
                        </div>
                        <button
                            class="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="重新整理"
                            @click="loadDirectory"
                        >
                            🔄
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- 分機表主體 -->
        <div class="container mx-auto px-4 py-6">
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div v-for="column in filteredData?.columns" :key="column.column_index" class="space-y-4">
                    <div v-for="division in column.divisions" :key="division.id" class="bg-white rounded-xl shadow-sm border overflow-hidden">
                        <!-- 處別標題 -->
                        <div class="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4">
                            <h2 class="font-bold text-lg">{{ division.name }}</h2>
                        </div>

                        <!-- 部門列表 -->
                        <div class="divide-y">
                            <div v-for="dept in division.departments" :key="dept.id">
                                <div class="w-full px-4 bg-gray-50 flex items-center justify-between">
                                    <span class="font-medium text-gray-700">{{ dept.name }}</span>
                                    <span class="text-gray-400 text-sm">{{ dept.users.length }}人</span>
                                </div>
                                <div class="divide-y divide-gray-100">
                                    <div
                                        v-for="(user, idx) in dept.users"
                                        :key="idx"
                                        class="px-4 hover:bg-blue-50 flex items-center justify-between transition group"
                                    >
                                        <div class="flex items-center gap-3">
                                            <div>
                                                <span class="font-medium text-gray-800">
                                                    <span v-if="user.title && user.is_department_head" class="text-gray-500 text-sm mr-1" v-html="highlightText(user.title)" />
                                                    <span v-html="highlightText(user.name)" />
                                                    <span v-if="user.is_secondary_department" class="ml-2 text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-medium">
                                                        兼任
                                                    </span>
                                                </span>
                                            </div>
                                        </div>
                                        <div class="text-right">
                                            <span
                                                v-if="user.extension"
                                                class="font-mono text-blue-600 font-semibold bg-blue-50 px-2 rounded group-hover:bg-blue-100 transition"
                                                v-html="highlightText(user.extension)"
                                            />
                                            <span v-else class="text-gray-400 text-sm">--</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 無結果提示 -->
            <div v-if="searchTerm && filteredData?.columns.every((col) => col.divisions.length === 0)" class="text-center py-12 text-gray-500">
                <div class="text-4xl mb-4">🔍</div>
                <div>找不到符合「{{ searchTerm }}」的結果</div>
            </div>
        </div>
    </div>
</template>

