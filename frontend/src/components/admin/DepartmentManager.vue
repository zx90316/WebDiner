<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import Loading from '@/components/Loading.vue'
import LoadingButton from '@/components/LoadingButton.vue'

interface Division {
    id: number
    name: string
    is_active: boolean
    display_column: number
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

interface ExtensionUser {
    employee_id: string
    name: string
    extension: string | null
    title: string | null
    is_department_head: boolean
    is_secondary_department: boolean
    custom_sort_order?: number | null
    user_id?: number
}

const authStore = useAuthStore()
const toastStore = useToastStore()

const departments = ref<Department[]>([])
const divisions = ref<Division[]>([])
const loading = ref(true)
const submitting = ref(false)
const editingId = ref<number | null>(null)
const divisionEditingId = ref<number | null>(null)
const showDivisionSection = ref(false)
const departmentUsers = ref<Map<number, ExtensionUser[]>>(new Map())
const updatingSortOrder = ref<Set<number>>(new Set())

// 新增部門表單
const newDept = reactive({
    name: '',
    division_id: null as number | null,
    display_column: 0,
    display_order: 0,
})

// 編輯部門表單
const editForm = reactive({
    name: '',
    division_id: null as number | null,
    display_column: 0,
    display_order: 0,
})

// 新增/編輯處別表單
const newDivision = reactive({ name: '', display_order: 0 })
const editDivision = reactive({ name: '', display_order: 0 })

const loadData = async () => {
    try {
        loading.value = true
        const [deptData, divData, extensionData, allUsersData] = await Promise.all([
            api.get('/admin/departments', authStore.token!),
            api.get('/admin/divisions', authStore.token!),
            api.get('/extension-directory/', authStore.token!),
            api.get('/admin/users', authStore.token!),
        ])
        departments.value = deptData
        divisions.value = divData
        
        // 建立員工 ID 到完整用戶資訊的對應
        const userMap = new Map(allUsersData.map((u: any) => [u.employee_id, u]))
        
        // 建立部門人員對應表
        const usersMap = new Map<number, ExtensionUser[]>()
        extensionData.columns.forEach((col: any) => {
            col.divisions.forEach((div: any) => {
                div.departments.forEach((dept: any) => {
                    const users = (dept.users || []).map((u: any): ExtensionUser => {
                        const fullUser: any = userMap.get(u.employee_id)
                        return {
                            ...u,
                            user_id: fullUser?.id,
                            custom_sort_order: fullUser?.custom_sort_order ?? null
                        }
                    })
                    usersMap.set(dept.id, users)
                })
            })
        })
        departmentUsers.value = usersMap
    } catch {
        toastStore.showToast('載入資料失敗', 'error')
    } finally {
        loading.value = false
    }
}

const updateUserSortOrder = async (userId: number, sortOrder: number | null) => {
    try {
        updatingSortOrder.value.add(userId)
        await api.put(`/admin/users/${userId}`, { custom_sort_order: sortOrder }, authStore.token!)
        toastStore.showToast('特例排序已更新', 'success')
        // 重新載入資料以反映排序變化
        await loadData()
    } catch (error: any) {
        toastStore.showToast(error.message || '更新失敗', 'error')
        // 重新載入以恢復原值
        await loadData()
    } finally {
        updatingSortOrder.value.delete(userId)
    }
}

// 部門 CRUD
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

const handleEdit = (dept: Department) => {
    editingId.value = dept.id
    editForm.name = dept.name
    editForm.division_id = dept.division_id
    editForm.display_column = dept.display_column || 0
    editForm.display_order = dept.display_order || 0
}

const handleUpdate = async () => {
    if (!editForm.name.trim()) {
        toastStore.showToast('部門名稱不可為空', 'error')
        return
    }
    try {
        submitting.value = true
        await api.put(`/admin/departments/${editingId.value}`, editForm, authStore.token!)
        toastStore.showToast('部門已更新', 'success')
        editingId.value = null
        loadData()
    } catch (error: any) {
        toastStore.showToast(error.message || '更新失敗', 'error')
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

// 處別 CRUD
const handleDivisionSubmit = async () => {
    if (!newDivision.name.trim()) {
        toastStore.showToast('請輸入處別名稱', 'error')
        return
    }
    try {
        submitting.value = true
        await api.post('/admin/divisions', newDivision, authStore.token!)
        toastStore.showToast('處別已新增', 'success')
        newDivision.name = ''
        newDivision.display_order = 0
        loadData()
    } catch (error: any) {
        toastStore.showToast(error.message || '操作失敗', 'error')
    } finally {
        submitting.value = false
    }
}

const handleDivisionEdit = (division: Division) => {
    divisionEditingId.value = division.id
    editDivision.name = division.name
    editDivision.display_order = division.display_order || 0
}

const handleDivisionUpdate = async () => {
    if (!editDivision.name.trim()) {
        toastStore.showToast('處別名稱不可為空', 'error')
        return
    }
    try {
        submitting.value = true
        await api.put(`/admin/divisions/${divisionEditingId.value}`, editDivision, authStore.token!)
        toastStore.showToast('處別已更新', 'success')
        divisionEditingId.value = null
        loadData()
    } catch (error: any) {
        toastStore.showToast(error.message || '更新失敗', 'error')
    } finally {
        submitting.value = false
    }
}

const handleDivisionDelete = async (id: number, name: string) => {
    const deptCount = departments.value.filter(d => d.division_id === id).length
    if (deptCount > 0) {
        toastStore.showToast(`無法刪除「${name}」：仍有 ${deptCount} 個部門屬於此處別`, 'error')
        return
    }
    if (!confirm(`確定要刪除「${name}」嗎？`)) return
    try {
        await api.delete(`/admin/divisions/${id}`, authStore.token!)
        toastStore.showToast('處別已刪除', 'success')
        loadData()
    } catch (error: any) {
        toastStore.showToast(error.message || '刪除失敗', 'error')
    }
}

const getDivision = (divisionId: number | null) => {
    if (!divisionId) return null
    return divisions.value.find((d) => d.id === divisionId) || null
}

// 排序後的處別
const sortedDivisions = computed(() => {
    return [...divisions.value].sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
})

// 按欄位分組，再按處別分組
const columnData = computed(() => {
    const columns: Array<{ divisionId: number | null; divisionName: string; divisionOrder: number; departments: Department[] }[]> = [[], [], [], []]
    
    // 先按欄位分組
    const deptsByColumn: Department[][] = [[], [], [], []]
    departments.value.forEach(dept => {
        const col = dept.display_column || 0
        if (col >= 0 && col < 4) {
            deptsByColumn[col].push(dept)
        }
    })

    // 每欄內按處別分組
    for (let col = 0; col < 4; col++) {
        const colDepts = deptsByColumn[col]
        const divisionGroups = new Map<number | null, Department[]>()
        
        colDepts.forEach(dept => {
            const divId = dept.division_id
            if (!divisionGroups.has(divId)) {
                divisionGroups.set(divId, [])
            }
            divisionGroups.get(divId)!.push(dept)
        })

        // 轉換為陣列並排序
        divisionGroups.forEach((depts, divId) => {
            depts.sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
            const div = getDivision(divId)
            columns[col].push({
                divisionId: divId,
                divisionName: div?.name || '未分類',
                divisionOrder: div?.display_order ?? 999,
                departments: depts,
            })
        })

        // 處別排序：按 display_order 排序，未分類的放最後
        // 與 ExtensionDirectory.vue 的排序邏輯一致
        columns[col].sort((a, b) => {
            // 未分類的（divisionId === null 或 0）放最後
            if (a.divisionId === null || a.divisionId === 0) return 1
            if (b.divisionId === null || b.divisionId === 0) return -1
            // 按 display_order 排序
            return a.divisionOrder - b.divisionOrder
        })
    }

    return columns
})

const getDeptCountByDivision = (divisionId: number) => {
    return departments.value.filter(d => d.division_id === divisionId).length
}

const getColumnDeptCount = (column: typeof columnData.value[0]) => {
    return column.reduce((sum, g) => sum + g.departments.length, 0)
}

onMounted(() => {
    loadData()
})
</script>

<template>
    <Loading v-if="loading" />
    <div v-else class="space-y-6">
        <!-- 處別管理區塊 (可收合) -->
        <div class="bg-white rounded-lg shadow overflow-hidden">
            <button
                @click="showDivisionSection = !showDivisionSection"
                class="w-full px-6 py-4 bg-gradient-to-r from-indigo-50 to-purple-50 flex items-center justify-between hover:from-indigo-100 hover:to-purple-100 transition"
            >
                <div class="flex items-center gap-3">
                    <span class="text-2xl">🏛️</span>
                    <div class="text-left">
                        <h2 class="text-lg font-bold text-gray-800">處別管理</h2>
                        <p class="text-sm text-gray-500">目前 {{ divisions.length }} 個處別</p>
                    </div>
                </div>
                <span :class="['text-2xl transition-transform', showDivisionSection ? 'rotate-180' : '']">▼</span>
            </button>

            <div v-if="showDivisionSection" class="p-6 border-t space-y-4">
                <form @submit.prevent="handleDivisionSubmit" class="flex gap-3 items-end bg-gray-50 p-4 rounded-lg">
                    <div class="flex-1">
                        <label class="block text-sm font-medium text-gray-700 mb-1">處別名稱</label>
                        <input
                            v-model="newDivision.name"
                            type="text"
                            placeholder="例如：管理處、技術處"
                            class="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div class="w-20">
                        <label class="block text-sm font-medium text-gray-700 mb-1">排序</label>
                        <input
                            v-model.number="newDivision.display_order"
                            type="number"
                            min="0"
                            class="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <LoadingButton
                        type="submit"
                        :loading="submitting"
                        class="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600 transition h-[42px]"
                    >
                        新增處別
                    </LoadingButton>
                </form>

                <div class="text-xs text-gray-500 bg-blue-50 p-2 rounded">
                    💡 排序數字越小，在同一欄內顯示越靠前（例如：車輛安全審驗中心=0, 管理處=1）
                </div>

                <div class="flex flex-wrap gap-2">
                    <div
                        v-for="division in sortedDivisions"
                        :key="division.id"
                        class="bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-100 flex items-center gap-2"
                    >
                        <template v-if="divisionEditingId === division.id">
                            <input
                                v-model="editDivision.name"
                                type="text"
                                class="w-28 p-1 border rounded text-sm"
                                autofocus
                            />
                            <input
                                v-model.number="editDivision.display_order"
                                type="number"
                                min="0"
                                class="w-12 p-1 border rounded text-sm"
                            />
                            <button @click="handleDivisionUpdate" :disabled="submitting" class="text-indigo-600 hover:text-indigo-800 text-sm">✓</button>
                            <button @click="divisionEditingId = null" class="text-gray-500 hover:text-gray-700 text-sm">✕</button>
                        </template>
                        <template v-else>
                            <span class="text-xs bg-indigo-200 text-indigo-700 px-1.5 py-0.5 rounded font-mono">#{{ division.display_order || 0 }}</span>
                            <span class="font-medium text-indigo-800">{{ division.name }}</span>
                            <span class="text-xs text-gray-500">({{ getDeptCountByDivision(division.id) }})</span>
                            <button @click="handleDivisionEdit(division)" class="text-indigo-600 hover:text-indigo-800 text-xs ml-1">編輯</button>
                            <button @click="handleDivisionDelete(division.id, division.name)" class="text-red-500 hover:text-red-700 text-xs">刪除</button>
                        </template>
                    </div>
                    <div v-if="divisions.length === 0" class="text-gray-500 py-2">尚無處別資料，請先新增處別</div>
                </div>
            </div>
        </div>

        <!-- 新增部門表單 -->
        <div class="bg-white p-6 rounded-lg shadow">
            <h2 class="text-xl font-bold mb-4">新增部門</h2>
            <form @submit.prevent="handleSubmit" class="flex flex-wrap gap-4 items-end">
                <div class="flex-1 min-w-[200px]">
                    <label class="block text-sm font-medium text-gray-700 mb-1">部門名稱</label>
                    <input
                        v-model="newDept.name"
                        type="text"
                        placeholder="例如：行政服務部、研究企畫一部"
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

        <!-- 部門列表 - 分機表預覽佈局 -->
        <div class="bg-white p-6 rounded-lg shadow">
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-xl font-bold">📞 分機表佈局預覽</h2>
                <p class="text-sm text-gray-500">共 {{ departments.length }} 個部門</p>
            </div>
            
            <!-- 4欄佈局 -->
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div v-for="(column, colIndex) in columnData" :key="colIndex" class="space-y-3">
                    <!-- 欄位標題 -->
                    <div class="bg-gray-100 rounded-lg px-3 py-2 text-center">
                        <span class="font-bold text-gray-600">第 {{ colIndex + 1 }} 欄</span>
                        <span class="text-xs text-gray-400 ml-2">
                            ({{ getColumnDeptCount(column) }} 個部門)
                        </span>
                    </div>

                    <!-- 處別分組 -->
                    <div
                        v-for="(group, groupIdx) in column"
                        :key="groupIdx"
                        class="bg-white rounded-lg border shadow-sm overflow-hidden"
                    >
                        <!-- 處別標題 -->
                        <div
                            :class="[
                                'px-3 text-white font-medium',
                                group.divisionId === null
                                    ? 'bg-orange-500'
                                    : 'bg-gradient-to-r from-blue-600 to-blue-700'
                            ]"
                        >
                            {{ group.divisionName }}
                        </div>

                        <!-- 部門列表 -->
                        <div class="divide-y">
                            <div v-for="dept in group.departments" :key="dept.id" class="group">
                                <!-- 編輯模式 -->
                                <div v-if="editingId === dept.id" class="p-3 bg-blue-50 space-y-2">
                                    <input
                                        v-model="editForm.name"
                                        type="text"
                                        class="w-full p-1.5 border rounded text-sm"
                                        autofocus
                                    />
                                    <div class="flex gap-2">
                                        <select
                                            v-model="editForm.division_id"
                                            class="flex-1 p-1 border rounded text-xs"
                                        >
                                            <option :value="null">未分類</option>
                                            <option v-for="div in divisions" :key="div.id" :value="div.id">{{ div.name }}</option>
                                        </select>
                                        <select
                                            v-model="editForm.display_column"
                                            class="w-20 p-1 border rounded text-xs"
                                        >
                                            <option :value="0">欄1</option>
                                            <option :value="1">欄2</option>
                                            <option :value="2">欄3</option>
                                            <option :value="3">欄4</option>
                                        </select>
                                        <input
                                            v-model.number="editForm.display_order"
                                            type="number"
                                            min="0"
                                            class="w-14 p-1 border rounded text-xs"
                                            placeholder="#"
                                        />
                                    </div>
                                    <div class="flex gap-2">
                                        <button
                                            @click="handleUpdate"
                                            :disabled="submitting"
                                            class="flex-1 bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
                                        >
                                            儲存
                                        </button>
                                        <button
                                            @click="editingId = null"
                                            class="flex-1 bg-gray-300 text-gray-700 px-2 py-1 rounded text-xs hover:bg-gray-400"
                                        >
                                            取消
                                        </button>
                                    </div>
                                </div>
                                <!-- 顯示模式 -->
                                <div v-else>
                                    <div class="px-3 hover:bg-gray-50 flex items-center justify-between">
                                        <div class="flex items-center gap-2">
                                            <span class="text-xs text-gray-400 font-mono">#{{ dept.display_order }}</span>
                                            <span class="font-medium text-gray-700">{{ dept.name }}</span>
                                            <span class="text-xs text-gray-400">({{ (departmentUsers.get(dept.id) || []).length }}人)</span>
                                        </div>
                                        <div class="opacity-0 group-hover:opacity-100 flex gap-1 transition">
                                            <button
                                                @click="handleEdit(dept)"
                                                class="text-blue-500 hover:text-blue-700 text-xs px-1"
                                            >
                                                編輯
                                            </button>
                                            <button
                                                @click="handleDelete(dept.id, dept.name)"
                                                class="text-red-500 hover:text-red-700 text-xs px-1"
                                            >
                                                刪除
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <!-- 人員列表 -->
                                    <div v-if="departmentUsers.get(dept.id)?.length" class="bg-gray-50 divide-y divide-gray-200">
                                        <div
                                            v-for="user in departmentUsers.get(dept.id)"
                                            :key="user.employee_id"
                                            class="px-3 hover:bg-blue-50 flex items-center justify-between transition group/user"
                                        >
                                            <div class="flex items-center gap-2 flex-1 min-w-0">
                                                <div class="flex items-center gap-1.5 min-w-0 flex-1">
                                                    <span v-if="user.title && user.is_department_head" class="text-gray-500 text-xs mr-1">
                                                        {{ user.title }}
                                                    </span>
                                                    <span class="font-medium text-gray-800 truncate">{{ user.name }}</span>
                                                    <span v-if="user.is_secondary_department" class="ml-1 text-xs bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap">
                                                        兼任
                                                    </span>
                                                </div>
                                            </div>
                                            <div class="flex items-center gap-2">
                                                <span
                                                    v-if="user.extension"
                                                    class="font-mono text-blue-600 font-semibold bg-blue-50 px-2 rounded text-sm"
                                                >
                                                    {{ user.extension }}
                                                </span>
                                                <span v-else class="text-gray-400 text-xs">--</span>
                                                <input
                                                    v-if="user.user_id"
                                                    :value="user.custom_sort_order ?? ''"
                                                    @blur="(e) => {
                                                        const value = (e.target as HTMLInputElement).value
                                                        const numValue = value === '' ? null : parseInt(value)
                                                        if (numValue !== user.custom_sort_order) {
                                                            updateUserSortOrder(user.user_id!, numValue)
                                                        }
                                                    }"
                                                    @keyup.enter="(e) => (e.target as HTMLInputElement).blur()"
                                                    type="number"
                                                    min="0"
                                                    placeholder="特例"
                                                    class="w-16 px-1.5 border rounded text-xs focus:ring-2 focus:ring-blue-500"
                                                    :disabled="updatingSortOrder.has(user.user_id!)"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div v-else class="px-3 py-2 text-xs text-gray-400 text-center bg-gray-50">
                                        尚無人員
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 空欄位提示 -->
                    <div v-if="column.length === 0" class="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center text-gray-400">
                        <div class="text-2xl mb-2">📭</div>
                        <div class="text-sm">此欄尚無部門</div>
                    </div>
                </div>
            </div>

            <div v-if="departments.length === 0" class="text-center text-gray-500 py-12">
                <div class="text-4xl mb-4">🏢</div>
                <div>尚無部門資料，請先新增部門</div>
            </div>
        </div>
    </div>
</template>
