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

const highlightText = (text: string | null): string => {
    if (!text || !searchTerm.value.trim()) return text || ''
    const regex = new RegExp(`(${searchTerm.value})`, 'gi')
    return text.replace(regex, '<mark class="bg-yellow-200 px-0.5 rounded">$1</mark>')
}

// 將文字中的英文部分和符號"・"用 span 包起來，設定字體大小為 6px
const wrapEnglishWithSmallFont = (text: string) => {
    return text.replace(/([A-Za-z0-9・]+)/g, '<span style="font-size: 6px;">$1</span>')
}

// 組合函數：先處理高亮，再處理英文小字體（但跳過已高亮的部分）
const formatText = (text: string | null): string => {
    if (!text) return ''
    // 先處理高亮
    const result = highlightText(text)
    // 如果沒有搜尋詞，直接處理小字體
    if (!searchTerm.value.trim()) {
        return wrapEnglishWithSmallFont(result)
    }
    // 如果有高亮，需要小心處理：只對非高亮部分應用小字體
    // 使用正則表達式分割字符串，分別處理高亮和非高亮部分
    const parts: string[] = []
    const regex = /(<mark[^>]*>.*?<\/mark>)/gi
    let lastIndex = 0
    let match
    
    while ((match = regex.exec(result)) !== null) {
        // 添加高亮前的部分（應用小字體）
        if (match.index > lastIndex) {
            const beforeText = result.substring(lastIndex, match.index)
            parts.push(wrapEnglishWithSmallFont(beforeText))
        }
        // 添加高亮部分（不處理）
        parts.push(match[1])
        lastIndex = regex.lastIndex
    }
    // 添加剩餘部分（應用小字體）
    if (lastIndex < result.length) {
        const remainingText = result.substring(lastIndex)
        parts.push(wrapEnglishWithSmallFont(remainingText))
    }
    
    return parts.length > 0 ? parts.join('') : wrapEnglishWithSmallFont(result)
}

const handlePrint = () => {
    if (!data.value) {
        toastStore.showToast('無資料可列印', 'error')
        return
    }
    // 直接調用瀏覽器的列印功能
    window.print()
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
    <div v-else class="extension-directory-container">
        <!-- 頂部控制列（列印時隱藏） -->
        <div class="print-controls">
            <div class="controls-wrapper">
                <div class="controls-left">
                    <h1 class="controls-title">
                        📞 財團法人車輛安全審驗中心分機表
                    </h1>
                </div>
                <div class="controls-right">
                    <div class="search-wrapper">
                        <input
                            v-model="searchTerm"
                            type="text"
                            placeholder="搜尋姓名、分機、工號..."
                            class="search-input"
                        />
                        <span class="search-icon">🔍</span>
                        <button
                            v-if="searchTerm"
                            class="search-clear"
                            @click="searchTerm = ''"
                        >
                            ✕
                        </button>
                    </div>
                    <button
                        class="control-button refresh-button"
                        title="重新整理"
                        @click="loadDirectory"
                    >
                        🔄
                    </button>
                    <button
                        class="control-button print-button"
                        title="列印分機表"
                        @click="handlePrint"
                    >
                        <span>🖨️</span>
                        <span>列印</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- 分機表主體 -->
        <div class="directory-content">
            <div class="print-header">
                <h1>財團法人車輛安全審驗中心分機表</h1>
                <span class="print-date">更新時間：{{ new Date(data.generated_at).toLocaleString('zh-TW', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }) }}</span>
            </div>
            <div class="columns-container">
                <div v-for="column in filteredData?.columns" :key="column.column_index" class="column-section">
                    <div v-for="division in column.divisions" :key="division.id" class="division-section">
                        <div class="division-header">{{ division.name }}</div>
                        <div class="departments-container">
                            <div v-for="dept in division.departments" :key="dept.id" class="department-section">
                                <div v-if="dept.show_name_in_directory" class="department-header">
                                    <span class="department-name">{{ dept.name }}</span>
                                </div>
                                <div class="users-list">
                                    <div
                                        v-for="(user, idx) in dept.users"
                                        :key="idx"
                                        class="user-row"
                                    >
                                        <span 
                                            class="user-title"
                                            :style="user.title && user.is_department_head ? 'width: 35%;' : ''"
                                        >
                                            {{ user.title && user.is_department_head ? user.title.split('').join(' ') : '' }}
                                        </span>
                                        <span class="user-spacer"></span>
                                        <span class="user-name">
                                            <span v-html="formatText(user.name)"></span>
                                        </span>
                                        <span class="user-extension" v-html="highlightText(user.extension || '--')"></span>
                                    </div>
                                    <div
                                        v-for="item in dept.items"
                                        :key="item.id"
                                        class="user-row"
                                    >
                                        <span class="user-title"></span>
                                        <span class="user-spacer"></span>
                                        <span class="user-name" v-html="highlightText(item.name || '　')"></span>
                                        <span 
                                            v-if="item.item_type === 'room'"
                                            class="user-extension"
                                            v-html="highlightText(item.extension || '　')"
                                        ></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 無結果提示 -->
            <div v-if="searchTerm && filteredData?.columns.every((col) => col.divisions.length === 0)" class="no-results">
                <div class="no-results-icon">🔍</div>
                <div>找不到符合「{{ searchTerm }}」的結果</div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.extension-directory-container {
    min-height: 100vh;
    background: white;
    font-family: "Microsoft JhengHei", "微軟正黑體", Arial, sans-serif;
}

/* 控制列樣式（列印時隱藏） */
.print-controls {
    background: white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    border-bottom: 1px solid #e5e7eb;
    position: sticky;
    top: 0;
    z-index: 10;
}

.controls-wrapper {
    max-width: 1400px;
    margin: 0 auto;
    display: flex;
}

@media (min-width: 768px) {
    .controls-wrapper {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
    }
}

.controls-left {
    flex: 1;
}

.controls-title {
    font-size: 1.5rem;
    font-weight: bold;
    color: #1f2937;
    margin: 0;
}

.controls-right {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.search-wrapper {
    position: relative;
}

.search-input {
    padding: 0.5rem 2.5rem 0.5rem 2.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    width: 16rem;
    font-size: 0.875rem;
}

.search-input:focus {
    outline: none;
    box-shadow: 0 0 0 2px #3b82f6;
    border-color: transparent;
}

.search-icon {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: #9ca3af;
    pointer-events: none;
}

.search-clear {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: #9ca3af;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
}

.search-clear:hover {
    color: #4b5563;
}

.control-button {
    padding: 0.5rem;
    color: #4b5563;
    background: none;
    border: none;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.2s;
}

.control-button:hover {
    color: #2563eb;
    background: #eff6ff;
}

.print-button {
    padding: 0.5rem 1rem;
    background: #16a34a;
    color: white;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.print-button:hover {
    background: #15803d;
}

/* 列印版樣式 */
.directory-content {
    max-width: 1400px;
    margin: 0 auto;
    padding: 1rem;
}

.print-header {
    margin-bottom: 0.5rem;
    padding-bottom: 0.375rem;
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

.print-date {
    font-size: 13px;
    color: #555;
    position: absolute;
    right: 0;
}

.columns-container {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0;
}

.column-section {
    display: flex;
    flex-direction: column;
    gap: 0;
}

.column-section:not(:first-child) .division-section {
    margin-left: -2px;
}

.division-section:not(:first-child) {
    margin-top: -3px;
}

.division-section {
    border: 2px solid black;
    overflow: hidden;
    page-break-inside: avoid;
}

.division-header {
    background: rgb(192, 192, 192);
    color: black;
    font-weight: bold;
    font-size: 13px;
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
    font-size: 13px;
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
    font-size: 13px;
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
    white-space: nowrap;
}

.user-extension {
    border-left: 1px solid black;
    min-width: 20%;
    text-align: center;
}

.no-results {
    text-align: center;
    padding: 3rem;
    color: #6b7280;
}

.no-results-icon {
    font-size: 2.5rem;
    margin-bottom: 1rem;
}

/* 列印樣式 */
@media print {
    .print-controls {
        display: none;
    }

    .directory-content {
        padding: 0;
        max-width: 100%;
    }
    
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
    
    .print-header {
        margin-bottom: 8px;
        padding-bottom: 6px;
    }
    
    .secondary-badge {
        display: none;
    }
}

@page {
    size: A4;
    margin: 10mm;
}
</style>

<!-- 非 scoped 樣式，用於列印時隱藏全域導航欄 -->
<style>
@media print {
    nav.bg-white.shadow-md,
    nav[class*="bg-white"][class*="shadow-md"] {
        display: none !important;
    }
}
</style>

