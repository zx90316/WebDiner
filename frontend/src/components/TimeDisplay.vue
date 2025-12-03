<script setup lang="ts">
import { ref } from 'vue'
import { useCurrentTime } from '@/composables/useTime'
import { setSimulatedTime, resetTimeOffset, ORDER_CUTOFF_HOUR } from '@/lib/timeService'

const props = defineProps<{
    isSysAdmin?: boolean
}>()

const { dateString, timeString, hour, isSimulated } = useCurrentTime()
const showAdjustPanel = ref(false)
const inputDateTime = ref('')

const isPastCutoff = () => hour.value >= ORDER_CUTOFF_HOUR

const handleSetTime = () => {
    if (inputDateTime.value) {
        setSimulatedTime(inputDateTime.value)
        showAdjustPanel.value = false
    }
}

const handleReset = () => {
    resetTimeOffset()
    showAdjustPanel.value = false
}

const quickSetTime = (hoursOffset: number) => {
    const now = new Date()
    now.setHours(now.getHours() + hoursOffset)
    setSimulatedTime(now.toISOString())
}

const setToSpecificHour = (targetHour: number) => {
    const now = new Date()
    now.setHours(targetHour, 0, 0, 0)
    setSimulatedTime(now.toISOString())
}
</script>

<template>
    <div class="relative">
        <!-- 時間顯示 -->
        <div
            :class="[
                'flex items-center gap-2 px-2 py-1 rounded text-xs cursor-pointer transition-colors',
                isSimulated
                    ? 'bg-orange-100 text-orange-700 border border-orange-300'
                    : 'bg-gray-100 text-gray-600',
                props.isSysAdmin ? 'hover:bg-gray-200' : ''
            ]"
            :title="props.isSysAdmin ? '點擊調整時間' : '當前台灣時間'"
            @click="props.isSysAdmin && (showAdjustPanel = !showAdjustPanel)"
        >
            <span class="font-mono">
                {{ dateString }} {{ timeString }}
            </span>
            <span v-if="isSimulated" class="text-[10px] bg-orange-500 text-white px-1 rounded">
                模擬
            </span>
            <span v-if="isPastCutoff()" class="text-[10px] bg-red-500 text-white px-1 rounded" title="已過當日訂餐截止時間">
                當日訂餐已截止
            </span>
            <span v-if="props.isSysAdmin" class="text-gray-400">⚙️</span>
        </div>

        <!-- 系統管理員調整面板 -->
        <div v-if="props.isSysAdmin && showAdjustPanel" class="absolute top-full right-0 mt-2 w-72 bg-white border rounded-lg shadow-xl z-50 p-4">
            <div class="flex justify-between items-center mb-3">
                <h3 class="font-bold text-gray-800">🕐 時間調整</h3>
                <button
                    class="text-gray-400 hover:text-gray-600"
                    @click="showAdjustPanel = false"
                >
                    ✕
                </button>
            </div>

            <!-- 目前狀態 -->
            <div class="mb-3 p-2 bg-gray-50 rounded text-sm">
                <div class="text-gray-500">目前時間：</div>
                <div class="font-mono text-gray-800">
                    {{ dateString }} {{ timeString }}
                </div>
                <div v-if="isSimulated" class="text-orange-600 text-xs mt-1">
                    ⚠️ 正在使用模擬時間
                </div>
            </div>

            <!-- 快捷按鈕 -->
            <div class="mb-3">
                <div class="text-xs text-gray-500 mb-1">快捷設定：</div>
                <div class="grid grid-cols-2 gap-1">
                    <button
                        class="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                        @click="setToSpecificHour(8)"
                    >
                        設為 08:00（當日可訂餐）
                    </button>
                    <button
                        class="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                        @click="setToSpecificHour(9)"
                    >
                        設為 09:00（當日訂餐已截止）
                    </button>
                    <button
                        class="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        @click="quickSetTime(-1)"
                    >
                        -1 小時
                    </button>
                    <button
                        class="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        @click="quickSetTime(1)"
                    >
                        +1 小時
                    </button>
                </div>
            </div>

            <!-- 自訂時間 -->
            <div class="mb-3">
                <div class="text-xs text-gray-500 mb-1">自訂時間：</div>
                <input
                    v-model="inputDateTime"
                    type="datetime-local"
                    class="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500"
                />
                <button
                    :disabled="!inputDateTime"
                    class="mt-1 w-full px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    @click="handleSetTime"
                >
                    套用
                </button>
            </div>

            <!-- 重置按鈕 -->
            <button
                class="w-full px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                @click="handleReset"
            >
                🔄 恢復真實時間
            </button>

            <div class="mt-2 text-[10px] text-gray-400">
                ⚠️ 此功能僅供系統管理員除錯使用
            </div>
        </div>
    </div>
</template>

