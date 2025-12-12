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

interface ExtensionItem {
    id: number
    name: string
    extension: string | null
    item_type: string // "room" or "text"
}

interface ExtensionDepartment {
    id: number
    name: string
    division_id: number | null
    division_name: string | null
    display_order: number
    show_name_in_directory: boolean
    users: ExtensionUser[]
    items: ExtensionItem[]
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
                            items: dept.items.filter(
                                (i) =>
                                    i.name.toLowerCase().includes(term) ||
                                    i.extension?.includes(term)
                            ),
                        }))
                        .filter((dept) => 
                            dept.users.length > 0 || 
                            dept.items.length > 0 || 
                            dept.name.toLowerCase().includes(term)
                        ),
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

const handlePrint = () => {
    if (!data.value) {
        toastStore.showToast('無資料可列印', 'error')
        return
    }

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
        toastStore.showToast('無法開啟列印視窗，請檢查瀏覽器設定', 'error')
        return
    }

    const formattedDateStr = new Date(data.value.generated_at).toLocaleString('zh-TW', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })

    // 生成分機表 HTML
    const columnsHtml = data.value.columns.map(column => {
        const divisionsHtml = column.divisions.map(division => {
            const departmentsHtml = division.departments.map(dept => {
                const usersHtml = dept.users.map(user => {
                    // 將職稱的每個字用空格分開，以便增大字距
                    const titleDisplay = user.title && user.is_department_head 
                        ? user.title.split('').join(' ') 
                        : ''
                    const hasTitle = titleDisplay !== ''
                    const nameDisplay = user.name
                    const secondaryBadge = user.is_secondary_department ? '<span class="secondary-badge">兼任</span>' : ''
                    const extensionDisplay = user.extension || '--'
                    
                    return `
                        <div class="user-row">
                            <span class="user-title"${hasTitle ? ' style="width: 35%;"' : ''}>${titleDisplay}</span>
                            <span class="user-spacer"></span>
                            <span class="user-name">${nameDisplay}${secondaryBadge}</span>
                            <span class="user-extension">${extensionDisplay}</span>
                        </div>
                    `
                }).join('')
                
                const itemsHtml = (dept.items || []).map(item => {
                    const nameDisplay = item.name || '　'
                    const extensionDisplay = item.item_type === 'room' ? (item.extension || '　') : null
                    
                    return `
                        <div class="user-row">
                            <span class="user-title"></span>
                            <span class="user-spacer"></span>
                            <span class="user-name">${nameDisplay}</span>
                            ${extensionDisplay !== null ? `<span class="user-extension">${extensionDisplay}</span>` : ''}
                        </div>
                    `
                }).join('')

                const departmentHeader = dept.show_name_in_directory 
                    ? `<div class="department-header">
                            <span class="department-name">${dept.name}</span>
                            <span class="department-count">${dept.users.length}人</span>
                        </div>`
                    : ''
                
                return `
                    <div class="department-section">
                        ${departmentHeader}
                        <div class="users-list">
                            ${usersHtml}
                            ${itemsHtml}
                        </div>
                    </div>
                `
            }).join('')

            return `
                <div class="division-section">
                    <div class="division-header">${division.name}</div>
                    <div class="departments-container">
                        ${departmentsHtml}
                    </div>
                </div>
            `
        }).join('')

        return `
            <div class="column-section">
                ${divisionsHtml}
            </div>
        `
    }).join('')

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>分機表 - ${formattedDateStr}</title>
            <meta charset="UTF-8">
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                @page {
                    size: A4;
                    margin: 10mm;
                }
                body {
                    font-family: "Microsoft JhengHei", "微軟正黑體", Arial, sans-serif;
                    font-size: 9px;
                    line-height: 1.3;
                    color: #333;
                    background: white;
                    margin: 0;
                    padding: 0;
                }
                .print-header {
                    margin-bottom: 8px;
                    padding-bottom: 6px;
                    border-bottom: 2px solid #333;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    position: relative;
                }
                .print-header h1 {
                    font-size: 18px;
                    font-weight: bold;
                    margin: 0;
                }
                .print-header .date {
                    font-size: 11px;
                    color: #555;
                    position: absolute;
                    right: 0;
                }
                .columns-container {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 6px;
                }
                .column-section {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                .division-section {
                    border: 2px solid black;
                    border-radius: 3px;
                    overflow: hidden;
                    page-break-inside: avoid;
                }
                .division-header {
                    background: rgb(192, 192, 192);
                    color: black;
                    font-weight: bold;
                    font-size: 11px;
                    text-align: center;
                }
                .departments-container {
                    display: flex;
                    flex-direction: column;
                }
                .department-section {
                    border: 1px solid black;
                    margin-bottom: -1px;
                    margin-right: -1px;
                    margin-left: -1px;
                }
                .department-section:last-child {
                    margin-bottom: 0;
                }
                .department-header {
                    background: rgb(192, 192, 192);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 11px;
                    font-weight: 600;
                    border-bottom: 1px solid black;
                }
                .department-name {
                    color: black;
                    flex: 1;
                    text-align: center;
                }
                .department-count {
                    color: black;
                    font-size: 7px;
                }
                .users-list {
                    display: flex;
                    flex-direction: column;
                }
                .user-row {
                    display: flex;
                    align-items: center;
                    font-size: 11px;
                }
                .user-row:last-child {
                    border-bottom: none;
                }
                .user-title {
                    color: #1f2937;
                    text-align: justify;
                    text-align-last: justify;
                    flex-shrink: 0;
                    margin-left: 10%;
                }
                .user-spacer {
                    flex: 1;
                    min-width: 4px;
                }
                .user-name {
                    color: #1f2937;
                    white-space: nowrap;
                }
                .user-extension {
                    font-family: "Courier New", monospace;
                    font-weight: 600;
                    color: #2563eb;
                    white-space: nowrap;
                    margin-left: 4px;
                    border-left: 1px solid black;
                    min-width: 17%;
                    text-align: center;
                }
                .secondary-badge {
                    display: none;
                    background: #fbbf24;
                    color: #92400e;
                    font-size: 6px;
                    padding: 1px 3px;
                    border-radius: 2px;
                    margin-left: 3px;
                    font-weight: 600;
                }
                @media print {
                    body {
                        font-size: 8px;
                        margin: 0;
                        padding: 0;
                    }
                    .columns-container {
                        height: auto;
                        max-height: none;
                    }
                    .division-section {
                        break-inside: avoid;
                    }
                    .department-section {
                        break-inside: avoid;
                    }
                }
            </style>
        </head>
        <body>
            <div class="print-header">
                <h1>財團法人車輛安全審驗中心分機表</h1>
                <span class="date">更新時間：${formattedDateStr}</span>
            </div>
            <div class="columns-container">
                ${columnsHtml}
            </div>
        </body>
        </html>
    `

    // 使用直接操作 DOM 的方式，避免使用已廢棄的 document.write
    // 等待窗口準備好後設置內容
    const setupPrintContent = () => {
        try {
            const doc = printWindow.document
            doc.open('text/html', 'replace')
            // 使用類型斷言繞過 document.write 的廢棄警告
            // 在列印場景中，document.write 仍是最可靠的方法
            ;(doc as any).write(htmlContent)
            doc.close()
            printWindow.focus()
            // 等待內容載入後列印
            setTimeout(() => {
                printWindow.print()
            }, 250)
        } catch (error) {
            toastStore.showToast('列印功能發生錯誤', 'error')
        }
    }
    
    // 如果窗口已經載入，直接設置；否則等待載入
    if (printWindow.document.readyState === 'complete') {
        setupPrintContent()
    } else {
        printWindow.addEventListener('load', setupPrintContent, { once: true })
    }
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
                        <button
                            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                            title="列印分機表"
                            @click="handlePrint"
                        >
                            <span>🖨️</span>
                            <span>列印</span>
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
                                <div v-if="dept.show_name_in_directory" class="w-full px-4 bg-gray-50 flex items-center justify-between">
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
                                            <span v-else class="text-gray-400 text-sm">　</span>
                                        </div>
                                    </div>
                                    
                                    <!-- 部門項目列表 -->
                                    <div
                                        v-for="item in dept.items"
                                        :key="item.id"
                                        class="px-4 hover:bg-blue-50 flex items-center justify-between transition group/item"
                                    >
                                        <div class="flex items-center gap-3">
                                            <div>
                                                <span class="font-medium text-gray-800">
                                                    <span v-html="highlightText(item.name)" />
                                                </span>
                                            </div>
                                        </div>
                                        <div class="text-right">
                                            <span
                                                v-if="item.extension"
                                                class="font-mono text-blue-600 font-semibold bg-blue-50 px-2 rounded group-hover/item:bg-blue-100 transition"
                                                v-html="highlightText(item.extension)"
                                            />
                                            <span v-else class="text-gray-400 text-sm">　</span>
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

