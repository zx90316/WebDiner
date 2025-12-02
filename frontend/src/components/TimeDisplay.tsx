import React, { useState } from 'react';
import { useCurrentTime } from '../hooks/useTime';
import {
    setSimulatedTime,
    resetTimeOffset,
    ORDER_CUTOFF_HOUR
} from '../lib/timeService';

interface TimeDisplayProps {
    isSysAdmin?: boolean;
}

export const TimeDisplay: React.FC<TimeDisplayProps> = ({ isSysAdmin = false }) => {
    const { dateString, timeString, hour, isSimulated } = useCurrentTime();
    const [showAdjustPanel, setShowAdjustPanel] = useState(false);
    const [inputDateTime, setInputDateTime] = useState('');

    const isPastCutoff = hour >= ORDER_CUTOFF_HOUR;

    const handleSetTime = () => {
        if (inputDateTime) {
            setSimulatedTime(inputDateTime);
            setShowAdjustPanel(false);
        }
    };

    const handleReset = () => {
        resetTimeOffset();
        setShowAdjustPanel(false);
    };

    // 快捷設定按鈕
    const quickSetTime = (hoursOffset: number) => {
        const now = new Date();
        now.setHours(now.getHours() + hoursOffset);
        setSimulatedTime(now.toISOString());
    };

    const setToSpecificHour = (targetHour: number) => {
        const now = new Date();
        now.setHours(targetHour, 0, 0, 0);
        setSimulatedTime(now.toISOString());
    };

    return (
        <div className="relative">
            {/* 時間顯示 */}
            <div
                className={`flex items-center gap-2 px-2 py-1 rounded text-xs cursor-pointer transition-colors
                    ${isSimulated 
                        ? 'bg-orange-100 text-orange-700 border border-orange-300' 
                        : 'bg-gray-100 text-gray-600'
                    }
                    ${isSysAdmin ? 'hover:bg-gray-200' : ''}
                `}
                onClick={() => isSysAdmin && setShowAdjustPanel(!showAdjustPanel)}
                title={isSysAdmin ? '點擊調整時間' : '當前台灣時間'}
            >
                <span className="font-mono">
                    {dateString} {timeString}
                </span>
                {isSimulated && (
                    <span className="text-[10px] bg-orange-500 text-white px-1 rounded">
                        模擬
                    </span>
                )}
                {isPastCutoff && (
                    <span className="text-[10px] bg-red-500 text-white px-1 rounded" title="已過當日訂餐截止時間">
                        當日訂餐已截止
                    </span>
                )}
                {isSysAdmin && (
                    <span className="text-gray-400">⚙️</span>
                )}
            </div>

            {/* 系統管理員調整面板 */}
            {isSysAdmin && showAdjustPanel && (
                <div className="absolute top-full right-0 mt-2 w-72 bg-white border rounded-lg shadow-xl z-50 p-4">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold text-gray-800">🕐 時間調整</h3>
                        <button
                            onClick={() => setShowAdjustPanel(false)}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            ✕
                        </button>
                    </div>

                    {/* 目前狀態 */}
                    <div className="mb-3 p-2 bg-gray-50 rounded text-sm">
                        <div className="text-gray-500">目前時間：</div>
                        <div className="font-mono text-gray-800">
                            {dateString} {timeString}
                        </div>
                        {isSimulated && (
                            <div className="text-orange-600 text-xs mt-1">
                                ⚠️ 正在使用模擬時間
                            </div>
                        )}
                    </div>

                    {/* 快捷按鈕 */}
                    <div className="mb-3">
                        <div className="text-xs text-gray-500 mb-1">快捷設定：</div>
                        <div className="grid grid-cols-2 gap-1">
                            <button
                                onClick={() => setToSpecificHour(8)}
                                className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                            >
                                設為 08:00（當日可訂餐）
                            </button>
                            <button
                                onClick={() => setToSpecificHour(9)}
                                className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                            >
                                設為 09:00（當日訂餐已截止）
                            </button>
                            <button
                                onClick={() => quickSetTime(-1)}
                                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                            >
                                -1 小時
                            </button>
                            <button
                                onClick={() => quickSetTime(1)}
                                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                            >
                                +1 小時
                            </button>
                        </div>
                    </div>

                    {/* 自訂時間 */}
                    <div className="mb-3">
                        <div className="text-xs text-gray-500 mb-1">自訂時間：</div>
                        <input
                            type="datetime-local"
                            value={inputDateTime}
                            onChange={(e) => setInputDateTime(e.target.value)}
                            className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            onClick={handleSetTime}
                            disabled={!inputDateTime}
                            className="mt-1 w-full px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                            套用
                        </button>
                    </div>

                    {/* 重置按鈕 */}
                    <button
                        onClick={handleReset}
                        className="w-full px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                        🔄 恢復真實時間
                    </button>

                    <div className="mt-2 text-[10px] text-gray-400">
                        ⚠️ 此功能僅供系統管理員除錯使用
                    </div>
                </div>
            )}
        </div>
    );
};

