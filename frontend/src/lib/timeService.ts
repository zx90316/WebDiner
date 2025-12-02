/**
 * 統一的時間服務模組
 * 所有前端時間相關的操作都應該使用此模組
 * 支援系統管理員手動調整時間來除錯
 */

const TAIWAN_TIMEZONE = 'Asia/Taipei';
const CUTOFF_HOUR = 9; // 早上 9 點截止

// 時間偏移量（毫秒），用於系統管理員調整時間
let timeOffset = 0;

// 時間變更監聽器
type TimeChangeListener = () => void;
const listeners: TimeChangeListener[] = [];

/**
 * 取得當前時間（考慮偏移量）
 */
export const getCurrentTime = (): Date => {
    return new Date(Date.now() + timeOffset);
};

/**
 * 取得台灣時間的日期字串 (YYYY-MM-DD)
 */
export const getTaiwanDateString = (date?: Date): string => {
    const d = date || getCurrentTime();
    return d.toLocaleDateString('sv-SE', { timeZone: TAIWAN_TIMEZONE });
};

/**
 * 取得台灣時間的當前小時 (0-23)
 */
export const getTaiwanHour = (date?: Date): number => {
    const d = date || getCurrentTime();
    return parseInt(
        d.toLocaleTimeString('en-US', {
            timeZone: TAIWAN_TIMEZONE,
            hour: 'numeric',
            hour12: false
        })
    );
};

/**
 * 取得台灣時間的完整時間字串 (HH:MM:SS)
 */
export const getTaiwanTimeString = (date?: Date): string => {
    const d = date || getCurrentTime();
    return d.toLocaleTimeString('zh-TW', {
        timeZone: TAIWAN_TIMEZONE,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
};

/**
 * 取得台灣時間的完整日期時間字串
 */
export const getTaiwanDateTimeString = (date?: Date): string => {
    const d = date || getCurrentTime();
    return d.toLocaleString('zh-TW', {
        timeZone: TAIWAN_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
};

/**
 * 檢查指定日期是否已過期（無法訂餐）
 * - 過去的日期：已過期
 * - 當天且已過 9 點：已過期
 */
export const isDatePast = (date: Date): boolean => {
    const taiwanTodayStr = getTaiwanDateString();
    const taiwanHour = getTaiwanHour();
    
    // 格式化目標日期
    const targetStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    if (targetStr < taiwanTodayStr) return true;
    if (targetStr === taiwanTodayStr) {
        return taiwanHour >= CUTOFF_HOUR;
    }
    return false;
};

/**
 * 取得最小可選訂餐日期
 * - 9 點前：今天
 * - 9 點後：明天
 */
export const getMinOrderDate = (): string => {
    const taiwanTodayStr = getTaiwanDateString();
    const taiwanHour = getTaiwanHour();
    
    // 如果台灣時間已過 9 點，最小日期為明天
    if (taiwanHour >= CUTOFF_HOUR) {
        const now = getCurrentTime();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return getTaiwanDateString(tomorrow);
    }
    
    return taiwanTodayStr;
};

/**
 * 檢查是否可以取消指定日期的訂單
 * - 只能在訂單當天 9 點前取消
 */
export const canCancelOrder = (orderDate: string): boolean => {
    const taiwanTodayStr = getTaiwanDateString();
    const taiwanHour = getTaiwanHour();
    
    const isSameDay = orderDate === taiwanTodayStr;
    const isBeforeCutoff = taiwanHour < CUTOFF_HOUR;
    
    return isSameDay && isBeforeCutoff;
};

// ============ 系統管理員除錯功能 ============

/**
 * 取得當前時間偏移量（毫秒）
 */
export const getTimeOffset = (): number => {
    return timeOffset;
};

/**
 * 設定時間偏移量（毫秒）
 * 正值：時間往前（未來）
 * 負值：時間往後（過去）
 */
export const setTimeOffset = (offset: number): void => {
    timeOffset = offset;
    // 儲存到 localStorage
    localStorage.setItem('debug_time_offset', String(offset));
    // 通知所有監聽器
    notifyListeners();
};

/**
 * 設定模擬時間
 * @param dateTimeStr - ISO 格式的日期時間字串，例如 "2025-01-15T08:30:00"
 */
export const setSimulatedTime = (dateTimeStr: string): void => {
    const targetTime = new Date(dateTimeStr).getTime();
    const currentTime = Date.now();
    setTimeOffset(targetTime - currentTime);
};

/**
 * 重置時間偏移（恢復真實時間）
 */
export const resetTimeOffset = (): void => {
    timeOffset = 0;
    localStorage.removeItem('debug_time_offset');
    notifyListeners();
};

/**
 * 檢查是否正在使用模擬時間
 */
export const isUsingSimulatedTime = (): boolean => {
    return timeOffset !== 0;
};

/**
 * 註冊時間變更監聽器
 */
export const addTimeChangeListener = (listener: TimeChangeListener): () => void => {
    listeners.push(listener);
    return () => {
        const index = listeners.indexOf(listener);
        if (index > -1) {
            listeners.splice(index, 1);
        }
    };
};

/**
 * 通知所有監聽器
 */
const notifyListeners = (): void => {
    listeners.forEach(listener => listener());
};

// 初始化：從 localStorage 恢復時間偏移
const savedOffset = localStorage.getItem('debug_time_offset');
if (savedOffset) {
    timeOffset = parseInt(savedOffset, 10) || 0;
}

// 導出常數
export const TIMEZONE = TAIWAN_TIMEZONE;
export const ORDER_CUTOFF_HOUR = CUTOFF_HOUR;

