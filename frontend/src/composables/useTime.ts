import { ref, onMounted, onUnmounted } from 'vue'
import {
    getCurrentTime,
    getTaiwanDateString,
    getTaiwanTimeString,
    getTaiwanDateTimeString,
    getTaiwanHour,
    isUsingSimulatedTime,
    addTimeChangeListener
} from '@/lib/timeService'

/**
 * 取得當前台灣時間的 Composable（每秒更新）
 */
export const useCurrentTime = (updateInterval = 1000) => {
    const time = ref(getCurrentTime())
    const dateString = ref(getTaiwanDateString())
    const timeString = ref(getTaiwanTimeString())
    const dateTimeString = ref(getTaiwanDateTimeString())
    const hour = ref(getTaiwanHour())
    const isSimulated = ref(isUsingSimulatedTime())

    let intervalId: ReturnType<typeof setInterval> | null = null
    let unsubscribe: (() => void) | null = null

    const updateTime = () => {
        const now = getCurrentTime()
        time.value = now
        dateString.value = getTaiwanDateString(now)
        timeString.value = getTaiwanTimeString(now)
        dateTimeString.value = getTaiwanDateTimeString(now)
        hour.value = getTaiwanHour(now)
        isSimulated.value = isUsingSimulatedTime()
    }

    onMounted(() => {
        // 每秒更新
        intervalId = setInterval(updateTime, updateInterval)
        
        // 監聽時間偏移變更
        unsubscribe = addTimeChangeListener(updateTime)
    })

    onUnmounted(() => {
        if (intervalId) {
            clearInterval(intervalId)
        }
        if (unsubscribe) {
            unsubscribe()
        }
    })

    return {
        time,
        dateString,
        timeString,
        dateTimeString,
        hour,
        isSimulated
    }
}

