import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../../components/Toast";
import { Loading, LoadingButton } from "../../components/Loading";

interface VendorWithMenu {
    vendor: {
        id: number;
        name: string;
        description: string;
    };
    menu_items: Array<{
        id: number;
        name: string;
        description: string;
        price: number;
    }>;
}

interface DaySelection {
    date: string;
    vendor_id: number;
    vendor_menu_item_id: number;
    vendor_name: string;
    item_name: string;
}

export const CalendarOrdering: React.FC = () => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selections, setSelections] = useState<{ [date: string]: DaySelection }>({});
    const [existingOrders, setExistingOrders] = useState<{ [date: string]: any }>({});
    const [availableVendors, setAvailableVendors] = useState<{ [date: string]: VendorWithMenu[] }>({});
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const { token } = useAuth();
    const { showToast } = useToast();

    useEffect(() => {
        loadExistingOrders();
    }, [currentMonth]);

    const getCalendarDays = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        // Get the day of week for the first day (0 = Sunday, 6 = Saturday)
        const firstDayOfWeek = firstDay.getDay();

        // Create array with empty slots for alignment
        const days: (Date | null)[] = [];

        // Add empty slots for days before the first day of the month
        for (let i = 0; i < firstDayOfWeek; i++) {
            days.push(null);
        }

        // Add all days of the month
        for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
            days.push(new Date(d));
        }

        return days;
    };

    const formatDate = (date: Date) => {
        // Use local timezone instead of UTC to avoid date shift
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const loadExistingOrders = async () => {
        try {
            setLoading(true);
            const orders = await api.get("/orders/", token!);
            const ordersMap: { [date: string]: any } = {};
            orders.forEach((order: any) => {
                ordersMap[order.order_date] = order;
            });
            setExistingOrders(ordersMap);
        } catch (error) {
            showToast("載入訂單失敗", "error");
        } finally {
            setLoading(false);
        }
    };

    const loadVendorsForDate = async (date: string) => {
        if (availableVendors[date]) return;

        try {
            const vendors = await api.get(`/vendors/available/${date}`, token!);
            setAvailableVendors((prev) => ({ ...prev, [date]: vendors }));
        } catch (error) {
            console.error("Failed to load vendors", error);
            showToast("載入廠商失敗", "error");
        }
    };

    const selectVendor = (date: string, vendorId: number, vendorName: string) => {
        const vendors = availableVendors[date] || [];
        const vendor = vendors.find((v) => v.vendor.id === vendorId);

        if (!vendor || vendor.menu_items.length === 0) {
            showToast("此廠商在該日期沒有可用品項", "error");
            return;
        }

        const firstItem = vendor.menu_items[0];

        setSelections((prev) => {
            const newSelections = {
                ...prev,
                [date]: {
                    date,
                    vendor_id: vendorId,
                    vendor_menu_item_id: firstItem.id,
                    vendor_name: vendorName,
                    item_name: firstItem.name,
                },
            };
            console.log("Updated selections:", newSelections);
            return newSelections;
        });
    };

    const clearSelection = (date: string) => {
        setSelections((prev) => {
            const newSelections = { ...prev };
            delete newSelections[date];
            return newSelections;
        });
    };

    const cancelOrder = async (orderId: number) => {
        try {
            await api.delete(`/orders/${orderId}`, token!);
            showToast("訂單已取消", "success");
            loadExistingOrders();
        } catch (error: any) {
            showToast(error.message || "取消訂單失敗", "error");
        }
    };

    const submitOrders = async () => {
        console.log("Current selections:", selections);
        const ordersToCreate = Object.values(selections).map((sel) => ({
            order_date: sel.date,
            vendor_id: sel.vendor_id,
            vendor_menu_item_id: sel.vendor_menu_item_id,
        }));

        console.log("Orders to create:", ordersToCreate);

        if (ordersToCreate.length === 0) {
            showToast("請先選擇要訂餐的日期", "info");
            return;
        }

        try {
            setSubmitting(true);
            const result = await api.post("/orders/batch", { orders: ordersToCreate }, token!);
            console.log("Batch order result:", result);
            showToast(`成功儲存 ${result.length} 天的餐點`, "success");
            setSelections({});
            loadExistingOrders();
        } catch (error: any) {
            console.error("Batch order error:", error);
            showToast(error.message || "批量儲存失敗", "error");
        } finally {
            setSubmitting(false);
        }
    };

    const days = getCalendarDays();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekDays = ["日", "一", "二", "三", "四", "五", "六"];

    if (loading) return <Loading fullScreen />;

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="container mx-auto px-4 max-w-6xl">
                <h1 className="text-3xl font-bold mb-6">月曆訂餐</h1>

                {/* Month Navigation */}
                <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-lg shadow">
                    <button
                        onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        ← 上個月
                    </button>
                    <h2 className="text-xl font-bold">
                        {currentMonth.getFullYear()} 年 {currentMonth.getMonth() + 1} 月
                    </h2>
                    <button
                        onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        下個月 →
                    </button>
                </div>

                <div className="bg-white p-4 rounded-lg shadow mb-6">
                    {/* Weekday Headers */}
                    <div className="grid grid-cols-7 gap-2 mb-2">
                        {weekDays.map((day, index) => (
                            <div
                                key={index}
                                className={`text-center font-bold py-2 ${index === 0 || index === 6 ? "text-red-500" : "text-gray-700"
                                    }`}
                            >
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-2">
                        {days.map((day, index) => {
                            if (!day) {
                                return <div key={`empty-${index}`} className="aspect-square" />;
                            }

                            const dateStr = formatDate(day);

                            // Check if date is past
                            const now = new Date();
                            const dayMidnight = new Date(day);
                            dayMidnight.setHours(0, 0, 0, 0);

                            let isPast = false;
                            if (dayMidnight < today) {
                                // Yesterday or earlier
                                isPast = true;
                            } else if (dayMidnight.getTime() === today.getTime()) {
                                // Today - check if it's past 9:00 AM
                                if (now.getHours() >= 9) {
                                    isPast = true;
                                }
                            }

                            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                            const hasOrder = existingOrders[dateStr];
                            const hasSelection = selections[dateStr];
                            const vendors = availableVendors[dateStr] || [];

                            // Can modify order if not past cutoff
                            const canModify = !isPast && !isWeekend;

                            return (
                                <div
                                    key={dateStr}
                                    className={`aspect-square border rounded-lg p-2 cursor-pointer transition ${isPast || isWeekend
                                        ? "bg-gray-200 opacity-50 cursor-not-allowed"
                                        : hasOrder
                                            ? "bg-green-100 border-green-400"
                                            : hasSelection
                                                ? "bg-blue-100 border-blue-400"
                                                : "bg-white hover:shadow-lg hover:border-blue-300"
                                        }`}
                                    onClick={() => !isPast && !isWeekend && !hasOrder && loadVendorsForDate(dateStr)}
                                >
                                    <div className="text-sm font-bold mb-1">{day.getDate()}</div>

                                    {isWeekend && <p className="text-xs text-gray-500">週末</p>}
                                    {isPast && !isWeekend && <p className="text-xs text-gray-500">已過期</p>}

                                    {/* Existing Order */}
                                    {hasOrder && (
                                        <div className="text-xs space-y-1">
                                            <div className="bg-green-50 p-2 rounded border border-green-200">
                                                <p className="font-bold text-green-700 truncate text-sm">
                                                    {hasOrder.vendor_name}
                                                </p>
                                                <p className="text-gray-600 truncate">
                                                    {hasOrder.menu_item_name}
                                                </p>
                                            </div>
                                            {canModify && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        cancelOrder(hasOrder.id);
                                                    }}
                                                    className="w-full bg-red-50 text-red-600 hover:bg-red-100 py-1 rounded text-xs font-medium transition"
                                                >
                                                    取消
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {/* Selection */}
                                    {!hasOrder && hasSelection && (
                                        <div className="text-xs">
                                            <p className="font-bold text-blue-700 truncate">已選擇</p>
                                            <p className="truncate">{hasSelection.vendor_name}</p>
                                            <p className="text-gray-600 truncate">{hasSelection.item_name}</p>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    clearSelection(dateStr);
                                                }}
                                                className="text-red-600 hover:text-red-800 mt-1 text-xs"
                                            >
                                                取消
                                            </button>
                                        </div>
                                    )}

                                    {/* Vendor Selection */}
                                    {!hasOrder && !hasSelection && !isPast && !isWeekend && vendors.length > 0 && (
                                        <div className="text-xs space-y-1 mt-1 scrollbar-hide">
                                            {vendors.map((v) => (
                                                <button
                                                    key={v.vendor.id}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        selectVendor(dateStr, v.vendor.id, v.vendor.name);
                                                    }}
                                                    className="w-full text-left p-1.5 bg-white border border-blue-200 text-gray-800 rounded hover:bg-blue-50 hover:border-blue-300 transition-all shadow-sm group"
                                                >
                                                    <div className="font-bold truncate text-blue-600 group-hover:text-blue-700">
                                                        {v.vendor.name}
                                                    </div>
                                                    {v.menu_items[0] && (
                                                        <div className="flex justify-between items-center mt-0.5">
                                                            <span className="text-[10px] text-gray-500 truncate flex-1">
                                                                {v.menu_items[0].name}
                                                            </span>
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {!hasOrder && !hasSelection && !isPast && !isWeekend && vendors.length === 0 && (
                                        <p className="text-xs text-gray-400">點擊載入</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Submit Button */}
                {Object.keys(selections).length > 0 && (
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="font-bold text-lg mb-2">
                            已選擇 {Object.keys(selections).length} 天
                        </h3>
                        <div className="text-sm text-gray-600 mb-4">
                            {Object.values(selections).map((sel) => (
                                <div key={sel.date}>
                                    {sel.date}: {sel.vendor_name} - {sel.item_name}
                                </div>
                            ))}
                        </div>
                        <LoadingButton
                            loading={submitting}
                            onClick={submitOrders}
                            className="w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 font-medium"
                        >
                            確認儲存
                        </LoadingButton>
                    </div>
                )}
            </div>
        </div>
    );
};
