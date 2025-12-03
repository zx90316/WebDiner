<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { api } from '@/lib/api'
import * as timeService from '@/lib/timeService'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import Loading from '@/components/Loading.vue'

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

interface FullMenuItem {
    id: number
    name: string
    description: string
    price: number
    weekday: number | null
}

interface VendorWithFullMenu {
    id: number
    name: string
    description: string
    color: string
    menu_items: FullMenuItem[]
}

interface MealOption {
    vendor_id: number
    vendor_name: string
    vendor_color: string
    item_id: number
    item_name: string
    item_description: string
}

interface DayOrder {
    date: string
    dayOfWeek: string
    isPast: boolean
    isWeekend: boolean
    existingOrder?: {
        id: number
        vendor_id: number
        vendor_name: string
        menu_item_name: string
        menu_item_description?: string
        is_no_order?: boolean
    }
    selectedMealIndex?: number
}

const authStore = useAuthStore()
const toastStore = useToastStore()

const currentDate = new Date()
const selectedYear = ref(currentDate.getFullYear())
const selectedMonth = ref(currentDate.getMonth() + 1)
const availableVendors = ref<VendorWithMenu[]>([])
const vendorsWithFullMenu = ref<VendorWithFullMenu[]>([])
const dayOrders = ref<DayOrder[]>([])
const existingOrders = ref<{ [date: string]: any }>({})
const specialDays = ref<{ [date: string]: boolean }>({})
const selectedMealType = ref<number | null>(null)
const loading = ref(false)
const submitting = ref(false)
const cancellingAll = ref(false)

const weekDayNames = ['日', '一', '二', '三', '四', '五', '六']
const weekDayNamesShort = ['一', '二', '三', '四', '五']

const yearOptions = computed(() => {
    const years = []
    for (let y = currentDate.getFullYear(); y <= currentDate.getFullYear() + 1; y++) {
        years.push(y)
    }
    return years
})

const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1)

const mealOptions = computed<MealOption[]>(() => {
    const options: MealOption[] = []
    availableVendors.value.forEach(v => {
        v.menu_items.forEach(item => {
            options.push({
                vendor_id: v.vendor.id,
                vendor_name: v.vendor.name,
                vendor_color: v.vendor.color,
                item_id: item.id,
                item_name: item.name,
                item_description: item.description,
            })
        })
    })
    return options
})

const hasNewSelections = computed(() => {
    return dayOrders.value.some(day => day.selectedMealIndex !== undefined && !day.existingOrder && !day.isPast)
})

const formatDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

const isDatePast = (date: Date) => timeService.isDatePast(date)

const isWeekend = (date: Date) => {
    const dateStr = formatDate(date)
    if (specialDays.value[dateStr] !== undefined) {
        return specialDays.value[dateStr]
    }
    return date.getDay() === 0 || date.getDay() === 6
}

const loadVendorsForMonth = async () => {
    try {
        loading.value = true
        const firstDay = `${selectedYear.value}-${String(selectedMonth.value).padStart(2, '0')}-01`
        const vendors = await api.get(`/vendors/available/${firstDay}`, authStore.token!)
        availableVendors.value = vendors
    } catch {
        toastStore.showToast('載入廠商失敗', 'error')
    } finally {
        loading.value = false
    }
}

const loadAllVendorsWithFullMenu = async () => {
    try {
        const vendors = await api.get('/vendors/', authStore.token!)
        const vendorsWithMenus: VendorWithFullMenu[] = await Promise.all(
            vendors.map(async (vendor: any) => {
                const menuItems = await api.get(`/vendors/${vendor.id}/menu`, authStore.token!)
                return {
                    ...vendor,
                    menu_items: menuItems,
                }
            })
        )
        vendorsWithFullMenu.value = vendorsWithMenus
    } catch {
        console.error('Failed to load full vendor menus')
    }
}

const loadExistingOrders = async () => {
    try {
        const orders = await api.get('/orders/', authStore.token!)
        const ordersMap: { [date: string]: any } = {}
        orders.forEach((order: any) => {
            ordersMap[order.order_date] = order
        })
        existingOrders.value = ordersMap
    } catch {
        toastStore.showToast('載入訂單失敗', 'error')
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

const generateDayOrders = () => {
    const daysInMonth = new Date(selectedYear.value, selectedMonth.value, 0).getDate()
    const days: DayOrder[] = []

    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(selectedYear.value, selectedMonth.value - 1, d)
        const dateStr = formatDate(date)
        const dayOfWeek = weekDayNames[date.getDay()]
        const isPast = isDatePast(date)
        const weekend = isWeekend(date)

        if (weekend) continue

        const existing = existingOrders.value[dateStr]

        days.push({
            date: dateStr,
            dayOfWeek,
            isPast,
            isWeekend: weekend,
            existingOrder: existing ? {
                id: existing.id,
                vendor_id: existing.vendor_id,
                vendor_name: existing.vendor_name || '不訂餐',
                menu_item_name: existing.menu_item_name || '不訂餐',
                menu_item_description: existing.menu_item_description,
                is_no_order: existing.is_no_order
            } : undefined,
        })
    }

    dayOrders.value = days
}

const selectMealType = (index: number) => {
    selectedMealType.value = selectedMealType.value === index ? null : index
}

const selectAllForMonth = async () => {
    if (selectedMealType.value === null) {
        toastStore.showToast('請先選擇訂餐方式', 'error')
        return
    }

    const meal = mealOptions.value[selectedMealType.value]
    if (!meal) {
        toastStore.showToast('選擇的餐點無效', 'error')
        return
    }

    const ordersToDelete = dayOrders.value
        .filter(day => !day.isPast && day.existingOrder)
        .map(day => day.existingOrder!.id)

    const datesToOrder = dayOrders.value
        .filter(day => !day.isPast)
        .map(day => day.date)

    if (datesToOrder.length === 0) {
        toastStore.showToast('本月沒有可訂餐的日期', 'info')
        return
    }

    try {
        submitting.value = true

        if (ordersToDelete.length > 0) {
            await Promise.all(ordersToDelete.map(id => api.delete(`/orders/${id}`, authStore.token!)))
        }

        const vendorPromises = datesToOrder.map(async (dateStr) => {
            try {
                const vendors = await api.get(`/vendors/available/${dateStr}`, authStore.token!)
                return { dateStr, vendors }
            } catch {
                return { dateStr, vendors: [] }
            }
        })

        const vendorResults = await Promise.all(vendorPromises)
        const vendorMap: { [date: string]: VendorWithMenu[] } = {}
        vendorResults.forEach(result => {
            vendorMap[result.dateStr] = result.vendors
        })

        const ordersToCreate: Array<{
            order_date: string
            vendor_id: number
            vendor_menu_item_id: number
            is_no_order: boolean
        }> = []
        let skipped = 0

        datesToOrder.forEach(dateStr => {
            const vendors = vendorMap[dateStr] || []
            let matchedItem: { vendorId: number; itemId: number } | null = null
            
            for (const v of vendors) {
                if (v.vendor.id !== meal.vendor_id) continue
                
                for (const item of v.menu_items) {
                    if (item.id === meal.item_id) {
                        matchedItem = {
                            vendorId: v.vendor.id,
                            itemId: item.id,
                        }
                        break
                    }
                }
                
                if (!matchedItem && meal.item_description) {
                    for (const item of v.menu_items) {
                        if (item.description === meal.item_description) {
                            matchedItem = {
                                vendorId: v.vendor.id,
                                itemId: item.id,
                            }
                            break
                        }
                    }
                }
                
                if (matchedItem) break
            }

            if (matchedItem) {
                ordersToCreate.push({
                    order_date: dateStr,
                    vendor_id: matchedItem.vendorId,
                    vendor_menu_item_id: matchedItem.itemId,
                    is_no_order: false,
                })
            } else {
                skipped++
            }
        })

        if (ordersToCreate.length === 0) {
            toastStore.showToast('沒有找到匹配的品項可訂餐', 'info')
            submitting.value = false
            return
        }

        const result = await api.post('/orders/batch', { orders: ordersToCreate }, authStore.token!)
        
        let message = `成功訂餐 ${result.length} 天`
        if (ordersToDelete.length > 0) {
            message += `（已取代 ${ordersToDelete.length} 筆原訂單）`
        }
        if (skipped > 0) {
            message += `，${skipped} 天無匹配品項已跳過`
        }
        toastStore.showToast(message, skipped > 0 ? 'info' : 'success')
        
        dayOrders.value = dayOrders.value.map(day => ({ ...day, selectedMealIndex: undefined }))
        loadExistingOrders()
    } catch (error: any) {
        toastStore.showToast(error.message || '全月訂餐失敗', 'error')
    } finally {
        submitting.value = false
    }
}

const cancelAllForMonth = async () => {
    const ordersToCancel = dayOrders.value
        .filter(day => !day.isPast && day.existingOrder)
        .map(day => day.existingOrder!.id)

    if (ordersToCancel.length === 0) {
        toastStore.showToast('本月沒有可取消的訂單', 'info')
        return
    }

    if (!confirm(`確定要取消本月 ${ordersToCancel.length} 筆訂單嗎？`)) {
        return
    }

    try {
        cancellingAll.value = true
        await Promise.all(ordersToCancel.map(id => api.delete(`/orders/${id}`, authStore.token!)))
        toastStore.showToast(`已取消 ${ordersToCancel.length} 筆訂單`, 'success')
        loadExistingOrders()
    } catch (error: any) {
        toastStore.showToast(error.message || '取消訂單失敗', 'error')
    } finally {
        cancellingAll.value = false
    }
}

const toggleDayMeal = (dateStr: string, mealIndex: number) => {
    dayOrders.value = dayOrders.value.map(day => {
        if (day.date !== dateStr) return day
        if (day.isPast || day.existingOrder) return day
        const newIndex = day.selectedMealIndex === mealIndex ? undefined : mealIndex
        return { ...day, selectedMealIndex: newIndex }
    })
}

const cancelExistingOrder = async (orderId: number) => {
    try {
        await api.delete(`/orders/${orderId}`, authStore.token!)
        toastStore.showToast('訂單已取消', 'success')
        loadExistingOrders()
    } catch (error: any) {
        toastStore.showToast(error.message || '取消訂單失敗', 'error')
    }
}

const submitOrders = async () => {
    const ordersToCreate = dayOrders.value
        .filter(day => day.selectedMealIndex !== undefined && !day.existingOrder && !day.isPast)
        .map(day => {
            const meal = mealOptions.value[day.selectedMealIndex!]
            return {
                order_date: day.date,
                vendor_id: meal.vendor_id,
                vendor_menu_item_id: meal.item_id,
                is_no_order: false,
            }
        })

    if (ordersToCreate.length === 0) {
        toastStore.showToast('請先選擇要訂餐的日期', 'info')
        return
    }

    try {
        submitting.value = true
        const result = await api.post('/orders/batch', { orders: ordersToCreate }, authStore.token!)
        toastStore.showToast(`成功儲存 ${result.length} 天的餐點`, 'success')
        dayOrders.value = dayOrders.value.map(day => ({ ...day, selectedMealIndex: undefined }))
        loadExistingOrders()
    } catch (error: any) {
        toastStore.showToast(error.message || '批量儲存失敗', 'error')
    } finally {
        submitting.value = false
    }
}

watch([selectedYear, selectedMonth], () => {
    loadVendorsForMonth()
    loadAllVendorsWithFullMenu()
    loadExistingOrders()
    loadSpecialDays()
})

watch([selectedYear, selectedMonth, availableVendors, existingOrders, specialDays], () => {
    generateDayOrders()
}, { deep: true })

onMounted(() => {
    loadVendorsForMonth()
    loadAllVendorsWithFullMenu()
    loadExistingOrders()
    loadSpecialDays()
})
</script>

<template>
    <Loading v-if="loading" full-screen />
    <div v-else class="min-h-screen" style="background: #f5f5f5; font-family: '新細明體', Arial, sans-serif">
        <div style="max-width: 1200px; margin: 0 auto; padding: 20px">
            <!-- Header -->
            <div style="background: linear-gradient(180deg, #4a90d9 0%, #357abd 100%); padding: 10px 20px; border-radius: 4px 4px 0 0; margin-bottom: 0">
                <h1 style="color: white; font-size: 16px; font-weight: bold; margin: 0">
                    查詢條件
                </h1>
            </div>

            <!-- Query Section -->
            <div style="background: white; border: 1px solid #ddd; border-top: none; padding: 20px; margin-bottom: 20px">
                <!-- Year/Month Selection -->
                <div style="margin-bottom: 15px">
                    <span style="margin-right: 10px">年度:</span>
                    <select
                        v-model="selectedYear"
                        style="padding: 4px 8px; border: 1px solid #ccc; border-radius: 3px; margin-right: 20px"
                    >
                        <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
                    </select>
                    <span style="margin-right: 10px">月份:</span>
                    <select
                        v-model="selectedMonth"
                        style="padding: 4px 8px; border: 1px solid #ccc; border-radius: 3px"
                    >
                        <option v-for="m in monthOptions" :key="m" :value="m">{{ String(m).padStart(2, '0') }}</option>
                    </select>
                </div>

                <!-- Meal Type Selection -->
                <div style="margin-bottom: 15px">
                    <div style="margin-bottom: 8px; font-weight: bold">訂餐方式</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 10px">
                        <label
                            v-for="(meal, index) in mealOptions"
                            :key="index"
                            :style="{
                                display: 'flex',
                                alignItems: 'center',
                                cursor: 'pointer',
                                padding: '6px 10px',
                                border: `1px solid ${selectedMealType === index ? meal.vendor_color || '#4a90d9' : '#ddd'}`,
                                borderRadius: '4px',
                                background: selectedMealType === index ? '#f0f7ff' : '#fff',
                                transition: 'all 0.2s'
                            }"
                        >
                            <input
                                type="radio"
                                name="mealType"
                                :checked="selectedMealType === index"
                                style="margin-right: 8px"
                                @change="selectMealType(index)"
                            />
                            <span>
                                <span :style="{ fontWeight: 'bold', color: meal.vendor_color || '#333' }">
                                    {{ meal.vendor_name }}
                                </span>
                                <span style="color: #666; font-size: 12px; margin-left: 4px">
                                    {{ meal.item_description ? meal.item_description : meal.item_name }}
                                </span>
                            </span>
                        </label>
                    </div>
                    <div style="margin-bottom: 15px; display: flex; gap: 10px; flex-wrap: wrap">
                        <button
                            :disabled="submitting || selectedMealType === null"
                            :style="{
                                padding: '8px 20px',
                                border: '1px solid #4cae4c',
                                borderRadius: '3px',
                                background: submitting || selectedMealType === null ? '#ccc' : 'linear-gradient(180deg, #5cb85c 0%, #4cae4c 100%)',
                                color: 'white',
                                cursor: submitting || selectedMealType === null ? 'not-allowed' : 'pointer',
                                fontWeight: 'bold'
                            }"
                            @click="selectAllForMonth"
                        >
                            {{ submitting ? '處理中...' : '全月訂餐' }}
                        </button>
                        <button
                            :disabled="cancellingAll"
                            :style="{
                                padding: '8px 20px',
                                border: '1px solid #d9534f',
                                borderRadius: '3px',
                                background: cancellingAll ? '#ccc' : 'linear-gradient(180deg, #d9534f 0%, #c9302c 100%)',
                                color: 'white',
                                cursor: cancellingAll ? 'not-allowed' : 'pointer',
                                fontWeight: 'bold'
                            }"
                            @click="cancelAllForMonth"
                        >
                            {{ cancellingAll ? '取消中...' : '取消全月訂餐' }}
                        </button>
                        <span style="font-size: 12px; color: #666; align-self: center; margin-left: 10px">
                            ※ 全月訂餐會取代本月已訂餐項目
                        </span>
                    </div>
                    <button
                        v-if="hasNewSelections"
                        :disabled="submitting"
                        :style="{
                            padding: '8px 24px',
                            background: submitting ? '#aaa' : 'linear-gradient(180deg, #5cb85c 0%, #4cae4c 100%)',
                            color: 'white',
                            border: '1px solid #4cae4c',
                            borderRadius: '3px',
                            cursor: submitting ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold'
                        }"
                        @click="submitOrders"
                    >
                        {{ submitting ? '送出中...' : '確認送出' }}
                    </button>
                </div>

                <hr style="margin: 20px 0; border-color: #ddd" />

                <!-- Meal Description Table -->
                <div style="background: #eee; padding: 10px">
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px">
                        <thead>
                            <tr>
                                <th style="border: 1px solid #ccc; padding: 8px; background: #f5f5f5; text-align: left; width: 70%">
                                    <strong>{{ selectedYear }}年{{ selectedMonth }}月訂餐方式說明:</strong>
                                </th>
                                <th style="border: 1px solid #ccc; padding: 8px; background: #f5f5f5; text-align: center; width: 30%">
                                    <strong>供應廠商</strong>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="vendor in vendorsWithFullMenu" :key="vendor.id">
                                <td style="border: 1px solid #ccc; padding: 8px; background: white; vertical-align: top">
                                    <div v-if="vendor.menu_items.filter(item => item.weekday === null).length > 0" :style="{ marginBottom: vendor.menu_items.filter(item => item.weekday !== null).length > 0 ? '10px' : '0' }">
                                        <div style="font-weight: bold; color: #333; margin-bottom: 4px">
                                            📅 每天供應
                                        </div>
                                        <div v-for="(item, idx) in vendor.menu_items.filter(item => item.weekday === null)" :key="idx" style="padding-left: 20px; margin-bottom: 2px">
                                            • {{ item.name }}
                                            <span v-if="item.description" style="color: #666; margin-left: 8px">
                                                ({{ item.description }})
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div v-if="vendor.menu_items.filter(item => item.weekday !== null).length > 0">
                                        <div style="font-weight: bold; color: #333; margin-bottom: 4px">
                                            📆 每週品項
                                        </div>
                                        <table style="border-collapse: collapse; width: 100%; background: #ffffff; border: 1px solid #ddd; margin-left: 20px; max-width: calc(100% - 20px)">
                                            <tbody>
                                                <tr v-for="category in Object.keys(vendor.menu_items.filter(item => item.weekday !== null).reduce((acc: any, item) => { const cat = item.description || item.name; if (!acc[cat]) acc[cat] = []; acc[cat].push({ weekday: item.weekday!, name: item.name }); return acc; }, {}))" :key="category">
                                                    <td style="padding: 6px 10px; border-bottom: 1px solid #eee; width: 80px; font-weight: bold; color: #000; background: #f0f0f0; white-space: nowrap">
                                                        {{ category }}
                                                    </td>
                                                    <td style="padding: 6px 10px; border-bottom: 1px solid #eee">
                                                        <span style="color: #888; font-size: 12px">
                                                            {{ (() => {
                                                                const items = vendor.menu_items.filter(item => item.weekday !== null && (item.description || item.name) === category).sort((a, b) => a.weekday! - b.weekday!)
                                                                const weekdayCount = items.length
                                                                return weekdayCount === 5 ? '星期一~五' : `星期${weekDayNamesShort.slice(0, weekdayCount).join('、')}`
                                                            })() }}依序：
                                                        </span>
                                                        {{ vendor.menu_items.filter(item => item.weekday !== null && (item.description || item.name) === category).sort((a, b) => a.weekday! - b.weekday!).map(item => item.name).join('、') }}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </td>
                                <td :style="{ border: '1px solid #ccc', padding: '8px', background: 'white', textAlign: 'center', fontWeight: 'bold', verticalAlign: 'top', color: vendor.color || '#333' }">
                                    {{ vendor.name }}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Order Table Section -->
            <div style="background: linear-gradient(180deg, #4a90d9 0%, #357abd 100%); padding: 10px 20px; border-radius: 4px 4px 0 0">
                <h2 style="color: white; font-size: 14px; font-weight: bold; margin: 0">
                    訂餐選單
                </h2>
            </div>

            <div style="background: white; border: 1px solid #ddd; border-top: none; padding: 20px">
                <div style="margin-bottom: 10px; font-weight: bold">
                    使用者：{{ authStore.user?.name }}
                </div>

                <div v-if="hasNewSelections" style="margin-bottom: 15px">
                    <button
                        :disabled="submitting"
                        :style="{
                            padding: '8px 24px',
                            background: submitting ? '#aaa' : 'linear-gradient(180deg, #5cb85c 0%, #4cae4c 100%)',
                            color: 'white',
                            border: '1px solid #4cae4c',
                            borderRadius: '3px',
                            cursor: submitting ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold'
                        }"
                        @click="submitOrders"
                    >
                        {{ submitting ? '送出中...' : '確認送出' }}
                    </button>
                </div>

                <!-- Orders Table -->
                <div style="overflow-x: auto">
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px; min-width: 800px">
                        <thead>
                            <tr style="background: #ffffff; text-align: center">
                                <th style="border: 1px solid #ccc; padding: 8px; width: 100px">日期</th>
                                <th style="border: 1px solid #ccc; padding: 8px; width: 60px">星期</th>
                                <th
                                    v-for="(meal, index) in mealOptions"
                                    :key="index"
                                    style="border: 1px solid #ccc; padding: 4px; font-size: 12px; line-height: 1.3"
                                >
                                    <div :style="{ fontWeight: 'bold', color: meal.vendor_color || '#333', width: 'max-content' }">
                                        {{ meal.vendor_name }}
                                    </div>
                                    <div style="font-weight: normal; color: #666; font-size: 11px; width: max-content">
                                        {{ meal.item_description ? meal.item_description : meal.item_name }}
                                    </div>
                                </th>
                                <th style="border: 1px solid #ccc; padding: 8px; width: 80px">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr
                                v-for="day in dayOrders"
                                :key="day.date"
                                :style="{ background: day.isPast ? '#f5f5f5' : 'white' }"
                            >
                                <td style="border: 1px solid #ccc; padding: 8px; text-align: center">
                                    {{ day.date.replace(/-/g, '/') }}
                                </td>
                                <td style="border: 1px solid #ccc; padding: 8px; text-align: center">
                                    {{ day.dayOfWeek }}
                                </td>
                                <td
                                    v-for="(_, mealIndex) in mealOptions"
                                    :key="mealIndex"
                                    style="border: 1px solid #ccc; padding: 8px; text-align: center"
                                >
                                    <input
                                        type="checkbox"
                                        :checked="day.selectedMealIndex === mealIndex || (!!day.existingOrder && mealOptions.findIndex(m =>
                                            m.vendor_id === day.existingOrder?.vendor_id &&
                                            ((day.existingOrder?.menu_item_description && m.item_description === day.existingOrder.menu_item_description) ||
                                            m.item_name === day.existingOrder?.menu_item_name)
                                        ) === mealIndex)"
                                        :disabled="day.isPast || !!day.existingOrder"
                                        :style="{ cursor: day.isPast || !!day.existingOrder ? 'not-allowed' : 'pointer' }"
                                        @change="toggleDayMeal(day.date, mealIndex)"
                                    />
                                </td>
                                <td style="border: 1px solid #ccc; padding: 8px; text-align: center">
                                    <button
                                        v-if="day.existingOrder && !day.isPast"
                                        style="padding: 4px 12px; background: #d9534f; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 12px"
                                        @click="cancelExistingOrder(day.existingOrder!.id)"
                                    >
                                        取消
                                    </button>
                                    <span v-if="day.isPast" style="color: #999; font-size: 12px">已過期</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div v-if="hasNewSelections" style="margin-top: 20px">
                    <button
                        :disabled="submitting"
                        :style="{
                            padding: '8px 24px',
                            background: submitting ? '#aaa' : 'linear-gradient(180deg, #5cb85c 0%, #4cae4c 100%)',
                            color: 'white',
                            border: '1px solid #4cae4c',
                            borderRadius: '3px',
                            cursor: submitting ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold'
                        }"
                        @click="submitOrders"
                    >
                        {{ submitting ? '送出中...' : '確認送出' }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

