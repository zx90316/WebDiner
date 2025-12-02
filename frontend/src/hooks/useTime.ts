import { useState, useEffect, useCallback } from 'react';
import {
    getCurrentTime,
    getTaiwanDateString,
    getTaiwanTimeString,
    getTaiwanDateTimeString,
    getTaiwanHour,
    isUsingSimulatedTime,
    addTimeChangeListener
} from '../lib/timeService';

/**
 * 取得當前台灣時間的 Hook（每秒更新）
 */
export const useCurrentTime = (updateInterval = 1000) => {
    const [time, setTime] = useState(getCurrentTime());
    const [dateString, setDateString] = useState(getTaiwanDateString());
    const [timeString, setTimeString] = useState(getTaiwanTimeString());
    const [dateTimeString, setDateTimeString] = useState(getTaiwanDateTimeString());
    const [hour, setHour] = useState(getTaiwanHour());
    const [isSimulated, setIsSimulated] = useState(isUsingSimulatedTime());

    const updateTime = useCallback(() => {
        const now = getCurrentTime();
        setTime(now);
        setDateString(getTaiwanDateString(now));
        setTimeString(getTaiwanTimeString(now));
        setDateTimeString(getTaiwanDateTimeString(now));
        setHour(getTaiwanHour(now));
        setIsSimulated(isUsingSimulatedTime());
    }, []);

    useEffect(() => {
        // 每秒更新
        const interval = setInterval(updateTime, updateInterval);
        
        // 監聽時間偏移變更
        const unsubscribe = addTimeChangeListener(updateTime);

        return () => {
            clearInterval(interval);
            unsubscribe();
        };
    }, [updateTime, updateInterval]);

    return {
        time,
        dateString,
        timeString,
        dateTimeString,
        hour,
        isSimulated
    };
};

