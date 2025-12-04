<script setup lang="ts">
import { computed } from 'vue'

interface SpecialDay {
    id: number
    date: string
    is_holiday: boolean
    description?: string
}

const props = defineProps<{
    year: number
    month: number
    specialDays: { [date: string]: SpecialDay }
}>()

const emit = defineEmits<{
    (e: 'day-click', date: Date): void
}>()

const weekDays = ['日', '一', '二', '三', '四', '五', '六']

const days = computed(() => {
    const firstDay = new Date(props.year, props.month, 1)
    const lastDay = new Date(props.year, props.month + 1, 0)
    const result: (Date | null)[] = []

    // Fill empty slots
    for (let i = 0; i < firstDay.getDay(); i++) result.push(null)
    // Fill days
    for (let d = 1; d <= lastDay.getDate(); d++) {
        result.push(new Date(props.year, props.month, d))
    }
    return result
})

const formatDateStr = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const getDayInfo = (date: Date) => {
    const dateStr = formatDateStr(date)
    const special = props.specialDays[dateStr]
    const dayOfWeek = date.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

    let isHoliday = isWeekend
    if (special) {
        isHoliday = special.is_holiday
    }

    let label = ''
    if (special) {
        label = special.is_holiday ? '休' : '班'
    }

    return { dateStr, special, isHoliday, label }
}

const handleClick = (date: Date) => {
    emit('day-click', date)
}
</script>

<template>
    <div class="bg-white p-4 rounded shadow border">
        <h3 class="text-lg font-bold text-center mb-2">{{ month + 1 }} 月</h3>
        <div class="grid grid-cols-7 gap-1 text-center text-sm mb-1">
            <div
                v-for="(d, i) in weekDays"
                :key="i"
                :class="[i === 0 || i === 6 ? 'text-red-500' : 'text-gray-500']"
            >{{ d }}</div>
        </div>
        <div class="grid grid-cols-7 gap-1">
            <template v-for="(date, i) in days" :key="i">
                <div v-if="!date" />
                <button
                    v-else
                    @click="handleClick(date)"
                    :class="[
                        'aspect-square flex items-center justify-center rounded text-sm relative transition',
                        getDayInfo(date).isHoliday ? 'text-red-600 bg-red-50 hover:bg-red-100' : 'text-gray-800 hover:bg-gray-100',
                        getDayInfo(date).special ? 'font-bold ring-2 ring-inset ring-blue-300' : ''
                    ]"
                >
                    {{ date.getDate() }}
                    <span
                        v-if="getDayInfo(date).special"
                        :class="[
                            'absolute -top-1 -right-1 text-[10px] px-1 rounded-full text-white',
                            getDayInfo(date).special.is_holiday ? 'bg-red-500' : 'bg-green-500'
                        ]"
                    >
                        {{ getDayInfo(date).label }}
                    </span>
                </button>
            </template>
        </div>
    </div>
</template>

