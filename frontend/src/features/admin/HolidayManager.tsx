import React, { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../../components/Toast";
import { Loading } from "../../components/Loading";

interface SpecialDay {
    id: number;
    date: string;
    is_holiday: boolean;
    description?: string;
}

export const HolidayManager: React.FC = () => {
    const [year, setYear] = useState(new Date().getFullYear());
    const [specialDays, setSpecialDays] = useState<{ [date: string]: SpecialDay }>({});
    const [loading, setLoading] = useState(false);
    const { token } = useAuth();
    const { showToast } = useToast();

    useEffect(() => {
        loadSpecialDays();
    }, []);

    const loadSpecialDays = async () => {
        try {
            setLoading(true);
            const days = await api.get("/admin/special_days", token!);
            const map: { [date: string]: SpecialDay } = {};
            days.forEach((d: SpecialDay) => {
                map[d.date] = d;
            });
            setSpecialDays(map);
        } catch (error) {
            showToast("載入節假日失敗", "error");
        } finally {
            setLoading(false);
        }
    };

    const toggleDay = async (date: Date) => {
        const dateStr = formatDate(date);
        const currentSpecial = specialDays[dateStr];
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        try {
            if (currentSpecial) {
                // If it's already a special day, remove it (revert to default)
                await api.delete(`/admin/special_days/${dateStr}`, token!);
                const newDays = { ...specialDays };
                delete newDays[dateStr];
                setSpecialDays(newDays);
            } else {
                // If it's not a special day, create one
                // If weekend -> make it workday (is_holiday=false)
                // If weekday -> make it holiday (is_holiday=true)
                const isHoliday = !isWeekend;
                const newDay = await api.post("/admin/special_days", {
                    date: dateStr,
                    is_holiday: isHoliday,
                    description: isHoliday ? "國定假日" : "補班日"
                }, token!);
                setSpecialDays(prev => ({ ...prev, [dateStr]: newDay }));
            }
        } catch (error) {
            showToast("更新失敗", "error");
        }
    };

    const formatDate = (date: Date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const months = Array.from({ length: 12 }, (_, i) => i);

    if (loading) return <Loading />;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">節假日管理</h2>
                <div className="flex items-center gap-4">
                    <button onClick={() => setYear(year - 1)} className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300">←</button>
                    <span className="text-xl font-bold">{year} 年</span>
                    <button onClick={() => setYear(year + 1)} className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300">→</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {months.map(month => (
                    <MonthCalendar
                        key={month}
                        year={year}
                        month={month}
                        specialDays={specialDays}
                        onDayClick={toggleDay}
                    />
                ))}
            </div>
        </div>
    );
};

const MonthCalendar: React.FC<{
    year: number;
    month: number;
    specialDays: { [date: string]: SpecialDay };
    onDayClick: (date: Date) => void;
}> = ({ year, month, specialDays, onDayClick }) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];

    // Fill empty slots
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    // Fill days
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));

    const weekDays = ["日", "一", "二", "三", "四", "五", "六"];

    return (
        <div className="bg-white p-4 rounded shadow border">
            <h3 className="text-lg font-bold text-center mb-2">{month + 1} 月</h3>
            <div className="grid grid-cols-7 gap-1 text-center text-sm mb-1">
                {weekDays.map((d, i) => (
                    <div key={i} className={`${i === 0 || i === 6 ? "text-red-500" : "text-gray-500"}`}>{d}</div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
                {days.map((date, i) => {
                    if (!date) return <div key={`empty-${i}`} />;

                    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                    const special = specialDays[dateStr];
                    const dayOfWeek = date.getDay();
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                    let isHoliday = isWeekend;

                    if (special) {
                        isHoliday = special.is_holiday;
                    }

                    let label = "";
                    if (special) {
                        label = special.is_holiday ? "休" : "班";
                    }

                    return (
                        <button
                            key={dateStr}
                            onClick={() => onDayClick(date)}
                            className={`
                                aspect-square flex items-center justify-center rounded text-sm relative transition
                                ${isHoliday ? "text-red-600 bg-red-50 hover:bg-red-100" : "text-gray-800 hover:bg-gray-100"}
                                ${special ? "font-bold ring-2 ring-inset ring-blue-300" : ""}
                            `}
                        >
                            {date.getDate()}
                            {special && (
                                <span className={`absolute -top-1 -right-1 text-[10px] px-1 rounded-full text-white ${special.is_holiday ? "bg-red-500" : "bg-green-500"}`}>
                                    {label}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
