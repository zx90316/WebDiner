<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { api } from '@/lib/api'
import * as timeService from '@/lib/timeService'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import Loading from '@/components/Loading.vue'
import LoadingButton from '@/components/LoadingButton.vue'

interface VendorWithMenu {
    vendor: {
        id: number
        name: string
        description: string
        color: string
    }
    menu_items: Array<{
        id: number
        name: string
        description: string
        price: number
    }>
}

interface DaySelection {
    date: string
    vendor_id?: number
    vendor_menu_item_id?: number
    vendor_name: string
    vendor_color?: string
    item_name: string
    item_description?: string
    is_no_order?: boolean
}

const authStore = useAuthStore()
const toastStore = useToastStore()

const currentMonth = ref(new Date())
const selections = ref<{ [date: string]: DaySelection }>({})
const existingOrders = ref<{ [date: string]: any }>({})
const availableVendors = ref<{ [date: string]: VendorWithMenu[] }>({})
const specialDays = ref<{ [date: string]: boolean }>({})
const loading = ref(false)
const submitting = ref(false)
const expandedDate = ref<string | null>(null)
const lastSelection = ref<DaySelection | null>(null)

const showClearModal = ref(false)
const clearRange = ref({ start: '', end: '' })

const weekDays = ['日', '一', '二', '三', '四', '五', '六']

const getCalendarDays = () => {
    const year = currentMonth.value.getFullYear()
    const month = currentMonth.value.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const firstDayOfWeek = firstDay.getDay()
    const days: (Date | null)[] = []

    for (let i = 0; i < firstDayOfWeek; i++) {
        days.push(null)
    }

    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
        days.push(new Date(d))
    }

    return days
}

const getWeeks = (days: (Date | null)[]) => {
    const weeks: (Date | null)[][] = []
    for (let i = 0; i < days.length; i += 7) {
        weeks.push(days.slice(i, i + 7))
    }
    if (weeks.length > 0) {
        const lastWeek = weeks[weeks.length - 1]
        while (lastWeek.length < 7) {
            lastWeek.push(null)
        }
    }
    return weeks
}

const formatDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

const loadExistingOrders = async () => {
    try {
        loading.value = true
        const orders = await api.get('/orders/', authStore.token!)
        const ordersMap: { [date: string]: any } = {}
        orders.forEach((order: any) => {
            ordersMap[order.order_date] = order
        })
        existingOrders.value = ordersMap
    } catch {
        toastStore.showToast('載入訂單失敗', 'error')
    } finally {
        loading.value = false
    }
}

const loadSpecialDays = async () => {
    try {
        const days = await api.get('/orders/special_days', authStore.token!)
        const map: { [date: string]: boolean } = {}
        days.forEach((d: any) => {
            map[d.date] = d.is_holiday
        })
        specialDays.value = map
    } catch {
        console.error('Failed to load special days')
    }
}

const loadVendorsForDate = async (date: string) => {
    if (availableVendors.value[date]) return

    try {
        const vendors = await api.get(`/vendors/available/${date}`, authStore.token!)
        availableVendors.value[date] = vendors
    } catch {
        toastStore.showToast('載入廠商失敗', 'error')
    }
}

const isDatePast = (date: Date) => timeService.isDatePast(date)

const isWeekend = (date: Date) => {
    const dateStr = formatDate(date)
    if (specialDays.value[dateStr] !== undefined) {
        return specialDays.value[dateStr]
    }
    return date.getDay() === 0 || date.getDay() === 6
}

const selectItem = (date: string, vendorId: number, vendorName: string, itemId: number, itemName: string, itemDescription: string, vendorColor: string) => {
    const newSelection: DaySelection = {
        date,
        vendor_id: vendorId,
        vendor_menu_item_id: itemId,
        vendor_name: vendorName,
        vendor_color: vendorColor,
        item_name: itemName,
        item_description: itemDescription,
        is_no_order: false,
    }
    selections.value[date] = newSelection
    lastSelection.value = newSelection
}

const selectNoOrder = (date: string) => {
    const newSelection: DaySelection = {
        date,
        vendor_name: '不訂餐',
        item_name: '不訂餐',
        is_no_order: true,
    }
    selections.value[date] = newSelection
    lastSelection.value = newSelection
}

const clearSelection = (date: string) => {
    delete selections.value[date]
}

const handleDateClick = async (dateStr: string) => {
    if (expandedDate.value === dateStr) {
        expandedDate.value = null
    } else {
        expandedDate.value = dateStr
        if (!availableVendors.value[dateStr]) {
            await loadVendorsForDate(dateStr)
        }
    }
}

const handleSelectItem = (dateStr: string, vendorId: number, vendorName: string, itemId: number, itemName: string, itemDescription: string, vendorColor: string) => {
    selectItem(dateStr, vendorId, vendorName, itemId, itemName, itemDescription, vendorColor)
    expandedDate.value = null
}

const handleSelectNoOrder = (dateStr: string) => {
    selectNoOrder(dateStr)
    expandedDate.value = null
}

const cancelOrder = async (orderId: number) => {
    try {
        await api.delete(`/orders/${orderId}`, authStore.token!)
        toastStore.showToast('訂單已取消', 'success')
        loadExistingOrders()
    } catch (error: any) {
        toastStore.showToast(error.message || '取消訂單失敗', 'error')
    }
}

const submitOrders = async () => {
    const ordersToCreate = Object.values(selections.value).map((sel) => ({
        order_date: sel.date,
        vendor_id: sel.vendor_id,
        vendor_menu_item_id: sel.vendor_menu_item_id,
        is_no_order: sel.is_no_order
    }))

    if (ordersToCreate.length === 0) {
        toastStore.showToast('請先選擇要訂餐的日期', 'info')
        return
    }

    try {
        submitting.value = true
        const result = await api.post('/orders/batch', { orders: ordersToCreate }, authStore.token!)
        toastStore.showToast(`成功儲存 ${result.length} 天的餐點`, 'success')
        selections.value = {}
        loadExistingOrders()
    } catch (error: any) {
        toastStore.showToast(error.message || '批量儲存失敗', 'error')
    } finally {
        submitting.value = false
    }
}

const applySelectionToMonth = async (selection: DaySelection) => {
    const days = getCalendarDays()
    const newSelections = { ...selections.value }
    let count = 0
    let skipped = 0

    const datesToProcess: string[] = []
    days.forEach(day => {
        if (!day) return
        const dateStr = formatDate(day)
        if (isDatePast(day) || isWeekend(day) || existingOrders.value[dateStr]) return
        datesToProcess.push(dateStr)
    })

    const vendorPromises = datesToProcess.map(async (dateStr) => {
        if (!availableVendors.value[dateStr]) {
            try {
                const vendors = await api.get(`/vendors/available/${dateStr}`, authStore.token!)
                return { dateStr, vendors }
            } catch {
                return { dateStr, vendors: [] }
            }
        }
        return { dateStr, vendors: availableVendors.value[dateStr] }
    })

    const vendorResults = await Promise.all(vendorPromises)
    const vendorMap: { [date: string]: VendorWithMenu[] } = {}
    vendorResults.forEach(result => {
        vendorMap[result.dateStr] = result.vendors
    })

    datesToProcess.forEach(dateStr => {
        const vendors = vendorMap[dateStr] || []
        let matchedItem: { vendorId: number; vendorName: string; vendorColor: string; itemId: number; itemName: string; itemDescription: string } | null = null
        
        for (const v of vendors) {
            if (v.vendor.id !== selection.vendor_id) continue
            
            for (const item of v.menu_items) {
                if (item.id === selection.vendor_menu_item_id) {
                    matchedItem = {
                        vendorId: v.vendor.id,
                        vendorName: v.vendor.name,
                        vendorColor: v.vendor.color,
                        itemId: item.id,
                        itemName: item.name,
                        itemDescription: item.description,
                    }
                    break
                }
            }
            
            if (!matchedItem && selection.item_description) {
                for (const item of v.menu_items) {
                    if (item.description === selection.item_description) {
                        matchedItem = {
                            vendorId: v.vendor.id,
                            vendorName: v.vendor.name,
                            vendorColor: v.vendor.color,
                            itemId: item.id,
                            itemName: item.name,
                            itemDescription: item.description,
                        }
                        break
                    }
                }
            }
            
            if (matchedItem) break
        }

        if (matchedItem) {
            newSelections[dateStr] = {
                date: dateStr,
                vendor_id: matchedItem.vendorId,
                vendor_menu_item_id: matchedItem.itemId,
                vendor_name: matchedItem.vendorName,
                vendor_color: matchedItem.vendorColor,
                item_name: matchedItem.itemName,
                item_description: matchedItem.itemDescription,
                is_no_order: false,
            }
            count++
        } else if (selection.is_no_order) {
            newSelections[dateStr] = { ...selection, date: dateStr }
            count++
        } else {
            skipped++
        }
    })

    availableVendors.value = { ...availableVendors.value, ...vendorMap }
    selections.value = newSelections
    
    if (skipped > 0) {
        toastStore.showToast(`已套用到本月 ${count} 天，${skipped} 天無匹配品項已跳過`, 'info')
    } else {
        toastStore.showToast(`已套用到本月 ${count} 天`, 'success')
    }
}

const applySelectionToQuarter = async (selection: DaySelection) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const endDate = new Date(today.getFullYear(), today.getMonth() + 3 + 1, 0)
    endDate.setHours(23, 59, 59, 999)
    const newSelections = { ...selections.value }
    let count = 0
    let skipped = 0

    const datesToProcess: string[] = []
    for (let date = new Date(today); date <= endDate; date.setDate(date.getDate() + 1)) {
        const currentDate = new Date(date)
        const dateStr = formatDate(currentDate)
        if (isDatePast(currentDate) || isWeekend(currentDate) || existingOrders.value[dateStr]) continue
        datesToProcess.push(dateStr)
    }

    const vendorPromises = datesToProcess.map(async (dateStr) => {
        if (!availableVendors.value[dateStr]) {
            try {
                const vendors = await api.get(`/vendors/available/${dateStr}`, authStore.token!)
                return { dateStr, vendors }
            } catch {
                return { dateStr, vendors: [] }
            }
        }
        return { dateStr, vendors: availableVendors.value[dateStr] }
    })

    const vendorResults = await Promise.all(vendorPromises)
    const vendorMap: { [date: string]: VendorWithMenu[] } = {}
    vendorResults.forEach(result => {
        vendorMap[result.dateStr] = result.vendors
    })

    datesToProcess.forEach(dateStr => {
        const vendors = vendorMap[dateStr] || []
        let matchedItem: { vendorId: number; vendorName: string; vendorColor: string; itemId: number; itemName: string; itemDescription: string } | null = null
        
        for (const v of vendors) {
            if (v.vendor.id !== selection.vendor_id) continue
            
            for (const item of v.menu_items) {
                if (item.id === selection.vendor_menu_item_id) {
                    matchedItem = {
                        vendorId: v.vendor.id,
                        vendorName: v.vendor.name,
                        vendorColor: v.vendor.color,
                        itemId: item.id,
                        itemName: item.name,
                        itemDescription: item.description,
                    }
                    break
                }
            }
            
            if (!matchedItem && selection.item_description) {
                for (const item of v.menu_items) {
                    if (item.description === selection.item_description) {
                        matchedItem = {
                            vendorId: v.vendor.id,
                            vendorName: v.vendor.name,
                            vendorColor: v.vendor.color,
                            itemId: item.id,
                            itemName: item.name,
                            itemDescription: item.description,
                        }
                        break
                    }
                }
            }
            
            if (matchedItem) break
        }

        if (matchedItem) {
            newSelections[dateStr] = {
                date: dateStr,
                vendor_id: matchedItem.vendorId,
                vendor_menu_item_id: matchedItem.itemId,
                vendor_name: matchedItem.vendorName,
                vendor_color: matchedItem.vendorColor,
                item_name: matchedItem.itemName,
                item_description: matchedItem.itemDescription,
                is_no_order: false,
            }
            count++
        } else if (selection.is_no_order) {
            newSelections[dateStr] = { ...selection, date: dateStr }
            count++
        } else {
            skipped++
        }
    })

    availableVendors.value = { ...availableVendors.value, ...vendorMap }
    selections.value = newSelections

    const endMonth = endDate.getMonth() + 1
    if (skipped > 0) {
        toastStore.showToast(`已套用到 ${endMonth} 月底，共 ${count} 天，${skipped} 天無匹配品項已跳過`, 'info')
    } else {
        toastStore.showToast(`已套用到 ${endMonth} 月底，共 ${count} 天`, 'success')
    }
}

const applyWeekPatternToMonth = async () => {
    const pattern: { [dayOfWeek: number]: DaySelection } = {}
    Object.values(selections.value).forEach(sel => {
        const date = new Date(sel.date)
        pattern[date.getDay()] = sel
    })

    if (Object.keys(pattern).length === 0) {
        toastStore.showToast('請先選擇至少一天的餐點作為範本', 'error')
        return
    }

    const days = getCalendarDays()
    const newSelections = { ...selections.value }
    let count = 0
    let skipped = 0

    const datesToProcess: { dateStr: string; dayOfWeek: number }[] = []
    days.forEach(day => {
        if (!day) return
        const dayOfWeek = day.getDay()
        const template = pattern[dayOfWeek]
        if (!template) return

        const dateStr = formatDate(day)
        if (isDatePast(day) || isWeekend(day) || existingOrders.value[dateStr]) return
        datesToProcess.push({ dateStr, dayOfWeek })
    })

    const vendorPromises = datesToProcess.map(async ({ dateStr }) => {
        if (!availableVendors.value[dateStr]) {
            try {
                const vendors = await api.get(`/vendors/available/${dateStr}`, authStore.token!)
                return { dateStr, vendors }
            } catch {
                return { dateStr, vendors: [] }
            }
        }
        return { dateStr, vendors: availableVendors.value[dateStr] }
    })

    const vendorResults = await Promise.all(vendorPromises)
    const vendorMap: { [date: string]: VendorWithMenu[] } = {}
    vendorResults.forEach(result => {
        vendorMap[result.dateStr] = result.vendors
    })

    datesToProcess.forEach(({ dateStr, dayOfWeek }) => {
        const template = pattern[dayOfWeek]
        const vendors = vendorMap[dateStr] || []
        
        let matchedItem: { vendorId: number; vendorName: string; vendorColor: string; itemId: number; itemName: string; itemDescription: string } | null = null
        
        for (const v of vendors) {
            if (v.vendor.id !== template.vendor_id) continue
            
            for (const item of v.menu_items) {
                if (item.id === template.vendor_menu_item_id) {
                    matchedItem = {
                        vendorId: v.vendor.id,
                        vendorName: v.vendor.name,
                        vendorColor: v.vendor.color,
                        itemId: item.id,
                        itemName: item.name,
                        itemDescription: item.description,
                    }
                    break
                }
            }
            
            if (!matchedItem && template.item_description) {
                for (const item of v.menu_items) {
                    if (item.description === template.item_description) {
                        matchedItem = {
                            vendorId: v.vendor.id,
                            vendorName: v.vendor.name,
                            vendorColor: v.vendor.color,
                            itemId: item.id,
                            itemName: item.name,
                            itemDescription: item.description,
                        }
                        break
                    }
                }
            }
            
            if (matchedItem) break
        }

        if (matchedItem) {
            newSelections[dateStr] = {
                date: dateStr,
                vendor_id: matchedItem.vendorId,
                vendor_menu_item_id: matchedItem.itemId,
                vendor_name: matchedItem.vendorName,
                vendor_color: matchedItem.vendorColor,
                item_name: matchedItem.itemName,
                item_description: matchedItem.itemDescription,
                is_no_order: false,
            }
            count++
        } else if (template.is_no_order) {
            newSelections[dateStr] = { ...template, date: dateStr }
            count++
        } else {
            skipped++
        }
    })

    availableVendors.value = { ...availableVendors.value, ...vendorMap }
    selections.value = newSelections

    if (skipped > 0) {
        toastStore.showToast(`已套用週範本到本月 ${count} 天，${skipped} 天無匹配品項已跳過`, 'info')
    } else {
        toastStore.showToast(`已套用週範本到本月 ${count} 天`, 'success')
    }
}

const applyWeekPatternToQuarter = async () => {
    const pattern: { [dayOfWeek: number]: DaySelection } = {}
    Object.values(selections.value).forEach(sel => {
        const date = new Date(sel.date)
        pattern[date.getDay()] = sel
    })

    if (Object.keys(pattern).length === 0) {
        toastStore.showToast('請先選擇至少一天的餐點作為範本', 'error')
        return
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const endDate = new Date(today.getFullYear(), today.getMonth() + 3 + 1, 0)
    endDate.setHours(23, 59, 59, 999)
    const newSelections = { ...selections.value }
    let count = 0
    let skipped = 0

    const datesToProcess: { dateStr: string; dayOfWeek: number }[] = []
    for (let date = new Date(today); date <= endDate; date.setDate(date.getDate() + 1)) {
        const currentDate = new Date(date)
        const dayOfWeek = currentDate.getDay()
        const template = pattern[dayOfWeek]

        if (!template) continue

        const dateStr = formatDate(currentDate)
        if (isDatePast(currentDate) || isWeekend(currentDate) || existingOrders.value[dateStr]) continue
        datesToProcess.push({ dateStr, dayOfWeek })
    }

    const vendorPromises = datesToProcess.map(async ({ dateStr }) => {
        if (!availableVendors.value[dateStr]) {
            try {
                const vendors = await api.get(`/vendors/available/${dateStr}`, authStore.token!)
                return { dateStr, vendors }
            } catch {
                return { dateStr, vendors: [] }
            }
        }
        return { dateStr, vendors: availableVendors.value[dateStr] }
    })

    const vendorResults = await Promise.all(vendorPromises)
    const vendorMap: { [date: string]: VendorWithMenu[] } = {}
    vendorResults.forEach(result => {
        vendorMap[result.dateStr] = result.vendors
    })

    datesToProcess.forEach(({ dateStr, dayOfWeek }) => {
        const template = pattern[dayOfWeek]
        const vendors = vendorMap[dateStr] || []
        
        let matchedItem: { vendorId: number; vendorName: string; vendorColor: string; itemId: number; itemName: string; itemDescription: string } | null = null
        
        for (const v of vendors) {
            if (v.vendor.id !== template.vendor_id) continue
            
            for (const item of v.menu_items) {
                if (item.id === template.vendor_menu_item_id) {
                    matchedItem = {
                        vendorId: v.vendor.id,
                        vendorName: v.vendor.name,
                        vendorColor: v.vendor.color,
                        itemId: item.id,
                        itemName: item.name,
                        itemDescription: item.description,
                    }
                    break
                }
            }
            
            if (!matchedItem && template.item_description) {
                for (const item of v.menu_items) {
                    if (item.description === template.item_description) {
                        matchedItem = {
                            vendorId: v.vendor.id,
                            vendorName: v.vendor.name,
                            vendorColor: v.vendor.color,
                            itemId: item.id,
                            itemName: item.name,
                            itemDescription: item.description,
                        }
                        break
                    }
                }
            }
            
            if (matchedItem) break
        }

        if (matchedItem) {
            newSelections[dateStr] = {
                date: dateStr,
                vendor_id: matchedItem.vendorId,
                vendor_menu_item_id: matchedItem.itemId,
                vendor_name: matchedItem.vendorName,
                vendor_color: matchedItem.vendorColor,
                item_name: matchedItem.itemName,
                item_description: matchedItem.itemDescription,
                is_no_order: false,
            }
            count++
        } else if (template.is_no_order) {
            newSelections[dateStr] = { ...template, date: dateStr }
            count++
        } else {
            skipped++
        }
    })

    availableVendors.value = { ...availableVendors.value, ...vendorMap }
    selections.value = newSelections

    const endMonth = endDate.getMonth() + 1
    if (skipped > 0) {
        toastStore.showToast(`已套用週範本到 ${endMonth} 月底，共 ${count} 天，${skipped} 天無匹配品項已跳過`, 'info')
    } else {
        toastStore.showToast(`已套用週範本到 ${endMonth} 月底，共 ${count} 天`, 'success')
    }
}

const getMonthRange = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    return {
        start: formatDate(firstDay),
        end: formatDate(lastDay)
    }
}

const openClearModal = () => {
    const monthRange = getMonthRange(currentMonth.value)
    clearRange.value = monthRange
    showClearModal.value = true
}

const handleClearOrders = async () => {
    if (!clearRange.value.start || !clearRange.value.end) {
        toastStore.showToast('請選擇開始與結束日期', 'error')
        return
    }

    try {
        loading.value = true
        const start = new Date(clearRange.value.start)
        const end = new Date(clearRange.value.end)

        const ordersToDelete = Object.values(existingOrders.value).filter((order: any) => {
            const d = new Date(order.order_date)
            return d >= start && d <= end && !isDatePast(d)
        })

        if (ordersToDelete.length === 0) {
            toastStore.showToast('區間內無可清除的有效訂單', 'info')
            loading.value = false
            showClearModal.value = false
            return
        }

        let successCount = 0
        await Promise.all(ordersToDelete.map(async (order: any) => {
            try {
                await api.delete(`/orders/${order.id}`, authStore.token!)
                successCount++
            } catch (e) {
                console.error(e)
            }
        }))

        toastStore.showToast(`已清除 ${successCount} 筆訂單`, 'success')
        loadExistingOrders()
        showClearModal.value = false
    } catch {
        toastStore.showToast('清除失敗', 'error')
    } finally {
        loading.value = false
    }
}

const getDayName = (dateStr: string) => {
    const date = new Date(dateStr)
    const dayNames = ['日', '一', '二', '三', '四', '五']
    return dayNames[date.getDay()]
}

const days = computed(() => getCalendarDays())
const weeks = computed(() => getWeeks(days.value))

watch(currentMonth, () => {
    loadExistingOrders()
})

onMounted(() => {
    loadExistingOrders()
    loadSpecialDays()
})
</script>

<template>
    <Loading v-if="loading" full-screen />
    <div v-else class="min-h-screen bg-gray-50 py-8">
        <div class="container mx-auto px-4 max-w-6xl">
            <h1 class="text-3xl font-bold mb-6">月曆訂餐</h1>

            <!-- Month Navigation -->
            <div class="flex justify-between items-center mb-6 bg-white p-4 rounded-lg shadow">
                <button
                    class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    @click="currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)"
                >
                    ← 上個月
                </button>
                <h2 class="text-xl font-bold">
                    {{ currentMonth.getFullYear() }} 年 {{ currentMonth.getMonth() + 1 }} 月
                </h2>
                <button
                    class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    @click="currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)"
                >
                    下個月 →
                </button>
            </div>

            <!-- Toolbar -->
            <div class="bg-white p-4 rounded-lg shadow mb-6 flex flex-wrap gap-2 items-center">
                <span class="font-bold text-gray-700 mr-2">批量操作:</span>
                <button 
                    :disabled="!lastSelection"
                    :class="[
                        'text-xs px-2 py-1 rounded transition',
                        lastSelection ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    ]"
                    :title="lastSelection ? `套用「${lastSelection.vendor_name} - ${lastSelection.item_name}」到本月` : '請先選擇一個餐點'"
                    @click="lastSelection && applySelectionToMonth(lastSelection)"
                >
                    單日 → 本月 
                    <span v-if="lastSelection" class="text-[10px] opacity-70">
                        {{ lastSelection.vendor_name + ' - ' + (lastSelection.item_description ? lastSelection.item_description + ' (' + lastSelection.item_name + ')' : lastSelection.item_name) }}
                    </span>
                </button>
                <button 
                    :disabled="!lastSelection"
                    :class="[
                        'text-xs px-2 py-1 rounded transition',
                        lastSelection ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    ]"
                    :title="lastSelection ? `套用「${lastSelection.vendor_name} - ${lastSelection.item_name}」到季（往後3個月）` : '請先選擇一個餐點'"
                    @click="lastSelection && applySelectionToQuarter(lastSelection)"
                >
                    單日 → 季 
                    <span v-if="lastSelection" class="text-[10px] opacity-70">
                        {{ lastSelection.vendor_name + ' - ' + (lastSelection.item_description ? lastSelection.item_description + ' (' + lastSelection.item_name + ')' : lastSelection.item_name) }}
                    </span>
                </button>
                <button class="text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded hover:bg-purple-100" @click="applyWeekPatternToMonth">
                    本週設定 → 本月
                </button>
                <button class="text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded hover:bg-purple-100" @click="applyWeekPatternToQuarter">
                    本週設定 → 季
                </button>
                <button class="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded text-sm transition" @click="openClearModal">
                    清空訂單
                </button>
            </div>

            <!-- Clear Modal -->
            <div v-if="showClearModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
                    <h3 class="font-bold text-lg mb-4">清空訂單</h3>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm text-gray-600 mb-2">快速選擇</label>
                            <div class="flex flex-wrap gap-2">
                                <button
                                    class="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded text-sm transition"
                                    @click="clearRange = getMonthRange(currentMonth)"
                                >
                                    本月
                                </button>
                                <button
                                    class="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded text-sm transition"
                                    @click="clearRange = getMonthRange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))"
                                >
                                    下個月
                                </button>
                                <button
                                    class="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded text-sm transition"
                                    @click="() => {
                                        const now = new Date()
                                        const endOfYear = new Date(now.getFullYear(), 11, 31)
                                        clearRange = {
                                            start: formatDate(now),
                                            end: formatDate(endOfYear)
                                        }
                                    }"
                                >
                                    今年剩餘
                                </button>
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm text-gray-600 mb-1">開始日期</label>
                            <input v-model="clearRange.start" type="date" class="w-full border rounded p-2" />
                        </div>
                        <div>
                            <label class="block text-sm text-gray-600 mb-1">結束日期</label>
                            <input v-model="clearRange.end" type="date" class="w-full border rounded p-2" />
                        </div>
                        <div class="text-xs text-red-500">* 已過期的訂單不會被清除</div>
                        <div class="flex justify-end gap-2 mt-4">
                            <button class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded" @click="showClearModal = false">取消</button>
                            <button class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600" @click="handleClearOrders">確認清空</button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="bg-white p-4 rounded-lg shadow mb-6">
                <!-- Weekday Headers -->
                <div class="grid grid-cols-7 gap-2 mb-2">
                    <div
                        v-for="(day, index) in weekDays"
                        :key="index"
                        :class="[
                            'text-center font-bold py-2',
                            index === 0 || index === 6 ? 'text-red-500' : 'text-gray-700'
                        ]"
                    >
                        {{ day }}
                    </div>
                </div>

                <!-- Calendar Grid -->
                <div class="space-y-1">
                    <div v-for="(week, weekIndex) in weeks" :key="'week-' + weekIndex">
                        <div class="grid grid-cols-7 gap-2">
                            <template v-for="(day, dayIndex) in week" :key="day ? formatDate(day) : 'empty-' + weekIndex + '-' + dayIndex">
                                <div v-if="!day" class="aspect-square" />
                                <div
                                    v-else
                                    :class="[
                                        'aspect-[1/2.5] sm:aspect-square border-2 rounded-lg p-1 sm:p-1.5 transition-all relative flex flex-col',
                                        isDatePast(day) || isWeekend(day)
                                            ? 'bg-gray-100 opacity-50 cursor-not-allowed border-gray-200'
                                            : existingOrders[formatDate(day)]
                                                ? 'cursor-default'
                                                : selections[formatDate(day)]
                                                    ? 'cursor-pointer hover:shadow-md'
                                                    : expandedDate === formatDate(day)
                                                        ? 'bg-blue-50 border-blue-400 shadow-md cursor-pointer'
                                                        : 'bg-white hover:shadow-md hover:border-blue-300 cursor-pointer'
                                    ]"
                                    :style="existingOrders[formatDate(day)]
                                        ? { borderColor: existingOrders[formatDate(day)].vendor_color || '#34D399', backgroundColor: (existingOrders[formatDate(day)].vendor_color || '#10B981') + '10' }
                                        : selections[formatDate(day)]
                                            ? { borderColor: selections[formatDate(day)].vendor_color || '#60A5FA', backgroundColor: (selections[formatDate(day)].vendor_color || '#3B82F6') + '10' }
                                            : {}"
                                    @click="!isDatePast(day) && !isWeekend(day) && !existingOrders[formatDate(day)] && handleDateClick(formatDate(day))"
                                >
                                    <div class="flex items-start justify-between">
                                        <span :class="['text-sm sm:text-base font-bold', expandedDate === formatDate(day) ? 'text-blue-600' : '']">
                                            {{ day.getDate() }}
                                        </span>
                                        <div
                                            v-if="existingOrders[formatDate(day)]"
                                            class="w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center flex-shrink-0"
                                            :style="{ backgroundColor: existingOrders[formatDate(day)].vendor_color || '#10B981' }"
                                        >
                                            <span class="text-white text-[10px] sm:text-xs">✓</span>
                                        </div>
                                        <div
                                            v-else-if="selections[formatDate(day)]"
                                            class="w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center border-2 flex-shrink-0"
                                            :style="{ borderColor: selections[formatDate(day)].vendor_color || '#3B82F6', backgroundColor: (selections[formatDate(day)].vendor_color || '#3B82F6') + '20' }"
                                        >
                                            <span :style="{ color: selections[formatDate(day)].vendor_color || '#3B82F6' }" class="text-[10px] sm:text-xs">●</span>
                                        </div>
                                    </div>

                                    <div class="flex-1 flex flex-col justify-center overflow-hidden">
                                        <span v-if="isWeekend(day)" class="text-[10px] sm:text-xs text-gray-400 text-center">休</span>
                                        
                                        <div v-if="existingOrders[formatDate(day)]" class="text-center">
                                            <p class="text-[10px] sm:text-[20px] text-gray-600 leading-tight break-words">
                                                {{ existingOrders[formatDate(day)].vendor_name }}
                                            </p>
                                            <p class="text-[7px] sm:text-[18px] text-gray-500 leading-tight break-words">
                                                {{ existingOrders[formatDate(day)].menu_item_description ? existingOrders[formatDate(day)].menu_item_description + ' (' + existingOrders[formatDate(day)].menu_item_name + ')' : existingOrders[formatDate(day)].menu_item_name }}
                                            </p>
                                            <button
                                                v-if="!isDatePast(day) && !isWeekend(day)"
                                                class="text-[8px] sm:text-[20px] text-red-500 hover:text-red-700"
                                                @click.stop="cancelOrder(existingOrders[formatDate(day)].id)"
                                            >
                                                取消
                                            </button>
                                        </div>
                                        
                                        <div v-else-if="selections[formatDate(day)]" class="text-center">
                                            <p class="text-[8px] sm:text-[20px] leading-tight break-words" :style="{ color: selections[formatDate(day)].vendor_color || '#3B82F6' }">
                                                {{ selections[formatDate(day)].vendor_name }}
                                            </p>
                                            <p class="text-[7px] sm:text-[18px] text-gray-500 leading-tight break-words">
                                                {{ selections[formatDate(day)].item_description ? selections[formatDate(day)].item_description + ' (' + selections[formatDate(day)].item_name + ')' : selections[formatDate(day)].item_name }}
                                            </p>
                                            <button
                                                class="text-[8px] sm:text-[20px] text-red-500 hover:text-red-700"
                                                @click.stop="clearSelection(formatDate(day))"
                                            >
                                                取消
                                            </button>
                                        </div>

                                        <div v-else-if="!isDatePast(day) && !isWeekend(day)" class="flex justify-center">
                                            <div :class="[
                                                'w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center transition-colors',
                                                expandedDate === formatDate(day) ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-400 hover:bg-blue-100 hover:text-blue-500'
                                            ]">
                                                <span class="text-sm sm:text-base">{{ expandedDate === formatDate(day) ? '−' : '+' }}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </template>
                        </div>

                        <!-- Expandable Panel -->
                        <div
                            v-if="week.some(d => d && formatDate(d) === expandedDate)"
                            class="transition-all duration-300 ease-in-out"
                        >
                            <div class="bg-gradient-to-b from-blue-50 to-white border-2 border-blue-200 rounded-lg mt-2 p-4 shadow-lg">
                                <div class="flex justify-between items-center mb-4">
                                    <div class="flex items-center gap-2">
                                        <span class="text-lg">📅</span>
                                        <h3 class="font-bold text-gray-800">
                                            {{ expandedDate }} (週{{ getDayName(expandedDate!) }}) 的餐點選擇
                                        </h3>
                                    </div>
                                    <button
                                        class="p-1.5 hover:bg-gray-200 rounded-full transition-colors"
                                        @click="expandedDate = null"
                                    >
                                        <span class="text-gray-500 text-lg">✕</span>
                                    </button>
                                </div>

                                <div v-if="availableVendors[expandedDate!]?.length > 0" class="space-y-4">
                                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                        <button
                                            v-for="{ vendor, item } in availableVendors[expandedDate!].flatMap(v => v.menu_items.map(item => ({ vendor: v.vendor, item })))"
                                            :key="`${vendor.id}-${item.id}`"
                                            class="w-full text-left bg-white rounded-lg border-l-4 shadow-sm hover:shadow-md transition-all p-3 group"
                                            :style="{ borderLeftColor: vendor.color || '#3B82F6' }"
                                            @click="handleSelectItem(expandedDate!, vendor.id, vendor.name, item.id, item.name, item.description, vendor.color)"
                                        >
                                            <div class="flex items-center gap-2 mb-1">
                                                <div
                                                    class="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                    :style="{ backgroundColor: vendor.color || '#3B82F6' }"
                                                />
                                                <span class="text-xs font-medium text-gray-500">{{ vendor.name }}</span>
                                            </div>
                                            <h4 class="font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                                                {{ item.description ? item.description + ' (' + item.name + ')' : item.name }}
                                            </h4>
                                        </button>
                                    </div>

                                    <button
                                        class="w-full p-3 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 hover:border-gray-400 transition-all"
                                        @click="handleSelectNoOrder(expandedDate!)"
                                    >
                                        <span class="font-medium">🚫 今天不訂餐</span>
                                    </button>
                                </div>
                                <div v-else class="text-center py-8 text-gray-500">
                                    <div class="animate-spin inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mb-2"></div>
                                    <p>載入中...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Submit Button -->
            <div v-if="Object.keys(selections).length > 0" class="bg-white p-6 rounded-lg shadow">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h3 class="font-bold text-lg mb-2">
                            已選擇 {{ Object.keys(selections).length }} 天
                        </h3>
                    </div>
                    <button class="text-sm text-red-500 hover:text-red-700" @click="selections = {}">
                        清除全部選擇
                    </button>
                </div>

                <div class="text-sm text-gray-600 mb-4 max-h-40 overflow-y-auto">
                    <div v-for="sel in Object.values(selections)" :key="sel.date" class="flex justify-between border-b py-1">
                        <span>{{ sel.date }}</span>
                        <span :class="sel.is_no_order ? 'text-gray-400' : 'font-medium'">
                            {{ sel.vendor_name }} - {{ sel.item_name }}
                        </span>
                    </div>
                </div>
                <LoadingButton
                    :loading="submitting"
                    class="w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 font-medium"
                    @click="submitOrders"
                >
                    確認儲存
                </LoadingButton>
            </div>
        </div>
    </div>
</template>

