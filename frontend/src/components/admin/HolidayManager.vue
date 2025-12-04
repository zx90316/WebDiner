<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import Loading from '@/components/Loading.vue'
import MonthCalendar from './MonthCalendar.vue'

interface SpecialDay {
    id: number
    date: string
    is_holiday: boolean
    description?: string
}

const authStore = useAuthStore()
const toastStore = useToastStore()

const year = ref(new Date().getFullYear())
const specialDays = ref<{ [date: string]: SpecialDay }>({})
const loading = ref(false)

const loadSpecialDays = async () => {
    try {
        loading.value = true
        const days = await api.get('/admin/special_days', authStore.token!)
        const map: { [date: string]: SpecialDay } = {}
        days.forEach((d: SpecialDay) => {
            map[d.date] = d
        })
        specialDays.value = map
    } catch {
        toastStore.showToast('載入節假日失敗', 'error')
    } finally {
        loading.value = false
    }
}

const toggleDay = async (date: Date) => {
    const dateStr = formatDate(date)
    const currentSpecial = specialDays.value[dateStr]
    const dayOfWeek = date.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

    try {
        if (currentSpecial) {
            // If it's already a special day, remove it (revert to default)
            await api.delete(`/admin/special_days/${dateStr}`, authStore.token!)
            const newDays = { ...specialDays.value }
            delete newDays[dateStr]
            specialDays.value = newDays
        } else {
            // If it's not a special day, create one
            // If weekend -> make it workday (is_holiday=false)
            // If weekday -> make it holiday (is_holiday=true)
            const isHoliday = !isWeekend
            const newDay = await api.post('/admin/special_days', {
                date: dateStr,
                is_holiday: isHoliday,
                description: isHoliday ? '國定假日' : '補班日'
            }, authStore.token!)
            specialDays.value = { ...specialDays.value, [dateStr]: newDay }
        }
    } catch {
        toastStore.showToast('更新失敗', 'error')
    }
}

const formatDate = (date: Date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

const months = computed(() => Array.from({ length: 12 }, (_, i) => i))

onMounted(() => {
    loadSpecialDays()
})
</script>

<template>
    <Loading v-if="loading" />
    <div v-else class="space-y-6">
        <div class="flex justify-between items-center">
            <h2 class="text-2xl font-bold">節假日管理</h2>
            <div class="flex items-center gap-4">
                <button @click="year--" class="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300">←</button>
                <span class="text-xl font-bold">{{ year }} 年</span>
                <button @click="year++" class="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300">→</button>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <MonthCalendar
                v-for="month in months"
                :key="month"
                :year="year"
                :month="month"
                :special-days="specialDays"
                @day-click="toggleDay"
            />
        </div>
    </div>
</template>
