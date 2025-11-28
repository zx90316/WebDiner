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
        color: string;
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
    vendor_id?: number;
    vendor_menu_item_id?: number;
    vendor_name: string;
    vendor_color?: string;
    item_name: string;
    is_no_order?: boolean;
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
                    vendor_color: vendor.vendor.color,
                    item_name: firstItem.name,
                    is_no_order: false,
                },
            };
            return newSelections;
        });
    };

    const selectNoOrder = (date: string) => {
        setSelections((prev) => ({
            ...prev,
            [date]: {
                date,
                vendor_name: "不訂餐",
                item_name: "不訂餐",
                is_no_order: true,
            },
        }));
    };

    // --- Batch Operations ---

    const expandUnselectedDays = async () => {
        const days = getCalendarDays();
        const datesToLoad: string[] = [];

        days.forEach(day => {
            if (!day) return;
            const dateStr = formatDate(day);

            // Skip if past, weekend, has order, or already selected
            if (isDatePast(day) || isWeekend(day)) return;
            if (existingOrders[dateStr]) return;
            if (selections[dateStr]) return; // Skip if already selected (even No Order)

            if (!availableVendors[dateStr]) {
                datesToLoad.push(dateStr);
            }
        });

        if (datesToLoad.length === 0) {
            showToast("本月沒有需要展開的未選日期", "info");
            return;
        }

        try {
            setLoading(true);
            const newVendorsMap = { ...availableVendors };

            // Fetch in parallel
            await Promise.all(datesToLoad.map(async (date) => {
                try {
                    const vendors = await api.get(`/vendors/available/${date}`, token!);
                    newVendorsMap[date] = vendors;
                } catch (e) {
                    console.error(`Failed to load for ${date}`, e);
                }
            }));

            setAvailableVendors(newVendorsMap);
            showToast(`已展開 ${datesToLoad.length} 天的選項`, "success");
        } catch (error) {
            showToast("展開失敗", "error");
        } finally {
            setLoading(false);
        }
    };

    const applySelectionToMonth = (selection: DaySelection) => {
        const days = getCalendarDays();
        const newSelections = { ...selections };
        let count = 0;

        days.forEach(day => {
            if (!day) return;
            const dateStr = formatDate(day);
            if (isDatePast(day) || isWeekend(day) || existingOrders[dateStr]) return;

            newSelections[dateStr] = { ...selection, date: dateStr };
            count++;
        });

        setSelections(newSelections);
        showToast(`已套用到本月 ${count} 天`, "success");
    };

    const applySelectionToYear = (selection: DaySelection) => {
        const startYear = currentMonth.getFullYear();
        const startMonth = currentMonth.getMonth();
        const newSelections = { ...selections };
        let count = 0;

        // Iterate through next 12 months
        for (let i = 0; i < 12; i++) {
            const targetDate = new Date(startYear, startMonth + i, 1);
            const y = targetDate.getFullYear();
            const m = targetDate.getMonth();
            const daysInMonth = new Date(y, m + 1, 0).getDate();

            for (let d = 1; d <= daysInMonth; d++) {
                const date = new Date(y, m, d);
                const dateStr = formatDate(date);

                if (isDatePast(date) || isWeekend(date) || existingOrders[dateStr]) continue;

                newSelections[dateStr] = { ...selection, date: dateStr };
                count++;
            }
        }

        setSelections(newSelections);
        showToast(`已套用到未來一年 ${count} 天`, "success");
    };

    const applyWeekPatternToMonth = () => {
        // Find pattern from current selections
        const pattern: { [dayOfWeek: number]: DaySelection } = {};
        Object.values(selections).forEach(sel => {
            const date = new Date(sel.date);
            pattern[date.getDay()] = sel;
        });

        if (Object.keys(pattern).length === 0) {
            showToast("請先選擇至少一天的餐點作為範本", "error");
            return;
        }

        const days = getCalendarDays();
        const newSelections = { ...selections };
        let count = 0;

        days.forEach(day => {
            if (!day) return;
            const dayOfWeek = day.getDay();
            const template = pattern[dayOfWeek];

            if (!template) return;

            const dateStr = formatDate(day);
            if (isDatePast(day) || isWeekend(day) || existingOrders[dateStr]) return;

            newSelections[dateStr] = { ...template, date: dateStr };
            count++;
        });

        setSelections(newSelections);
        showToast(`已套用週範本到本月 ${count} 天`, "success");
    };

    const applyWeekPatternToYear = () => {
        const pattern: { [dayOfWeek: number]: DaySelection } = {};
        Object.values(selections).forEach(sel => {
            const date = new Date(sel.date);
            pattern[date.getDay()] = sel;
        });

        if (Object.keys(pattern).length === 0) {
            showToast("請先選擇至少一天的餐點作為範本", "error");
            return;
        }

        const startYear = currentMonth.getFullYear();
        const startMonth = currentMonth.getMonth();
        const newSelections = { ...selections };
        let count = 0;

        // Iterate through next 12 months
        for (let i = 0; i < 12; i++) {
            const targetDate = new Date(startYear, startMonth + i, 1);
            const y = targetDate.getFullYear();
            const m = targetDate.getMonth();
            const daysInMonth = new Date(y, m + 1, 0).getDate();

            for (let d = 1; d <= daysInMonth; d++) {
                const date = new Date(y, m, d);
                const dayOfWeek = date.getDay();
                const template = pattern[dayOfWeek];

                if (!template) continue;

                const dateStr = formatDate(date);
                if (isDatePast(date) || isWeekend(date) || existingOrders[dateStr]) continue;

                newSelections[dateStr] = { ...template, date: dateStr };
                count++;
            }
        }

        setSelections(newSelections);
        showToast(`已套用週範本到未來一年 ${count} 天`, "success");
    };

    const applyMonthPatternToYear = () => {
        // Combine existing orders and selections to form the "Month Template"
        // We map by "Day of Month" (1st, 2nd, 3rd...)
        const pattern: { [dayOfMonth: number]: DaySelection | any } = {};

        // 1. Load from existing orders
        Object.values(existingOrders).forEach((order: any) => {
            const date = new Date(order.order_date);
            // Convert order to selection-like object if needed, or just store essential info
            // Since we need to create NEW selections, we need vendor_id etc.
            // But existingOrders might not have all IDs if the API didn't return them? 
            // The API returns vendor_id and vendor_menu_item_id.
            if (date.getMonth() === currentMonth.getMonth()) {
                pattern[date.getDate()] = {
                    vendor_id: order.vendor_id,
                    vendor_menu_item_id: order.vendor_menu_item_id,
                    vendor_name: order.vendor_name,
                    item_name: order.menu_item_name,
                    is_no_order: order.status === "NoOrder"
                };
            }
        });

        // 2. Override with current selections
        Object.values(selections).forEach(sel => {
            const date = new Date(sel.date);
            if (date.getMonth() === currentMonth.getMonth()) {
                pattern[date.getDate()] = sel;
            }
        });

        if (Object.keys(pattern).length === 0) {
            showToast("本月尚無任何訂單或選擇可供複製", "error");
            return;
        }

        const startYear = currentMonth.getFullYear();
        const startMonth = currentMonth.getMonth();
        const newSelections = { ...selections };
        let count = 0;

        // Iterate through next 12 months
        for (let i = 1; i < 12; i++) { // Start from i=1 to skip current month
            const targetDate = new Date(startYear, startMonth + i, 1);
            const y = targetDate.getFullYear();
            const m = targetDate.getMonth();
            const daysInMonth = new Date(y, m + 1, 0).getDate();

            for (let d = 1; d <= daysInMonth; d++) {
                const template = pattern[d];
                if (!template) continue;

                const date = new Date(y, m, d);
                const dateStr = formatDate(date);

                if (isDatePast(date) || isWeekend(date) || existingOrders[dateStr]) continue;

                newSelections[dateStr] = { ...template, date: dateStr };
                count++;
            }
        }

        setSelections(newSelections);
        showToast(`已套用月範本到未來一年 ${count} 天`, "success");
    };

    const [clearRange, setClearRange] = useState<{ start: string, end: string }>({ start: "", end: "" });
    const [showClearModal, setShowClearModal] = useState(false);

    const handleClearOrders = async () => {
        if (!clearRange.start || !clearRange.end) {
            showToast("請選擇開始與結束日期", "error");
            return;
        }

        // Simple loop delete - in production a batch delete endpoint is better
        // But for now we'll just find orders in range and delete them
        try {
            setLoading(true);
            const start = new Date(clearRange.start);
            const end = new Date(clearRange.end);

            // Filter orders to delete
            const ordersToDelete = Object.values(existingOrders).filter((order: any) => {
                const d = new Date(order.order_date);
                return d >= start && d <= end && !isDatePast(d);
            });

            if (ordersToDelete.length === 0) {
                showToast("區間內無可清除的有效訂單", "info");
                setLoading(false);
                setShowClearModal(false);
                return;
            }

            // Delete one by one (limitation of current API)
            // TODO: Add batch delete API
            let successCount = 0;
            await Promise.all(ordersToDelete.map(async (order: any) => {
                try {
                    await api.delete(`/orders/${order.id}`, token!);
                    successCount++;
                } catch (e) {
                    console.error(e);
                }
            }));

            showToast(`已清除 ${successCount} 筆訂單`, "success");
            loadExistingOrders();
            setShowClearModal(false);
        } catch (error) {
            showToast("清除失敗", "error");
        } finally {
            setLoading(false);
        }
    };

    // Helper functions
    const isDatePast = (date: Date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(date);
        target.setHours(0, 0, 0, 0);

        if (target < today) return true;
        if (target.getTime() === today.getTime()) {
            return new Date().getHours() >= 9;
        }
        return false;
    };

    const isWeekend = (date: Date) => date.getDay() === 0 || date.getDay() === 6;

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
            is_no_order: sel.is_no_order
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

                {/* Toolbar */}
                <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-wrap gap-2 items-center">
                    <span className="font-bold text-gray-700 mr-2">批量操作:</span>
                    <button onClick={expandUnselectedDays} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm transition">
                        展開本月未選日期
                    </button>
                    <button onClick={() => setShowClearModal(true)} className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded text-sm transition">
                        清空訂單
                    </button>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                    {/* Advanced Batch Actions */}
                    <div className="text-xs text-gray-500 font-bold mb-1 w-full">進階套用:</div>
                    {Object.keys(selections).length === 1 && (
                        <>
                            <button onClick={() => applySelectionToMonth(Object.values(selections)[0])} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100">
                                單日 → 本月
                            </button>
                            <button onClick={() => applySelectionToYear(Object.values(selections)[0])} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100">
                                單日 → 全年
                            </button>
                        </>
                    )}
                    <button onClick={applyWeekPatternToMonth} className="text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded hover:bg-purple-100">
                        本週設定 → 本月
                    </button>
                    <button onClick={applyWeekPatternToYear} className="text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded hover:bg-purple-100">
                        本週設定 → 全年
                    </button>
                    <button onClick={applyMonthPatternToYear} className="text-xs bg-pink-50 text-pink-600 px-2 py-1 rounded hover:bg-pink-100">
                        本月設定 → 全年
                    </button>
                </div>


                {/* Clear Modal */}
                {showClearModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
                            <h3 className="font-bold text-lg mb-4">清空訂單</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">開始日期</label>
                                    <input type="date" value={clearRange.start} onChange={e => setClearRange(prev => ({ ...prev, start: e.target.value }))} className="w-full border rounded p-2" />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">結束日期</label>
                                    <input type="date" value={clearRange.end} onChange={e => setClearRange(prev => ({ ...prev, end: e.target.value }))} className="w-full border rounded p-2" />
                                </div>
                                <div className="text-xs text-red-500">* 已過期的訂單不會被清除</div>
                                <div className="flex justify-end gap-2 mt-4">
                                    <button onClick={() => setShowClearModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">取消</button>
                                    <button onClick={handleClearOrders} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">確認清空</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

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

                            // Find vendor color for existing order
                            let existingOrderColor = "#10B981"; // Default green
                            let existingOrderBg = "#ECFDF5"; // Default green-50
                            let existingOrderBorder = "#34D399"; // Default green-400

                            if (hasOrder && availableVendors[dateStr]) {
                                const vendor = availableVendors[dateStr].find(v => v.vendor.id === hasOrder.vendor_id);
                                if (vendor && vendor.vendor.color) {
                                    existingOrderColor = vendor.vendor.color;
                                    existingOrderBg = `${vendor.vendor.color}1A`; // 10% opacity
                                    existingOrderBorder = vendor.vendor.color;
                                }
                            }

                            // Find vendor color for selection
                            let selectionColor = "#3B82F6"; // Default blue
                            let selectionBg = "#EFF6FF"; // Default blue-50
                            let selectionBorder = "#60A5FA"; // Default blue-400

                            if (hasSelection && hasSelection.vendor_color) {
                                selectionColor = hasSelection.vendor_color;
                                selectionBg = `${hasSelection.vendor_color}1A`; // 10% opacity
                                selectionBorder = hasSelection.vendor_color;
                            }

                            // Can modify order if not past cutoff
                            const canModify = !isPast && !isWeekend;

                            return (
                                <div
                                    key={dateStr}
                                    style={hasOrder
                                        ? { backgroundColor: existingOrderBg, borderColor: existingOrderBorder }
                                        : hasSelection
                                            ? { backgroundColor: selectionBg, borderColor: selectionBorder }
                                            : {}
                                    }
                                    className={`aspect-square border rounded-lg p-2 cursor-pointer transition ${isPast || isWeekend
                                        ? "bg-gray-200 opacity-50 cursor-not-allowed"
                                        : hasOrder
                                            ? "" // Style handled by inline style
                                            : hasSelection
                                                ? "" // Style handled by inline style
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
                                            <div
                                                className="p-2 rounded border"
                                                style={{
                                                    backgroundColor: existingOrderBg,
                                                    borderColor: existingOrderBorder,
                                                    color: existingOrderColor
                                                }}
                                            >
                                                <p className="font-bold truncate text-sm" style={{ color: existingOrderColor }}>
                                                    {hasOrder.vendor_name}
                                                </p>
                                                <p className="truncate text-gray-600">
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
                                            <p className="font-bold truncate" style={{ color: selectionColor }}>已選擇</p>
                                            <p className="truncate" style={{ color: selectionColor }}>{hasSelection.vendor_name}</p>
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
                                            {/* No Order Button */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    selectNoOrder(dateStr);
                                                }}
                                                className="w-full text-left p-1.5 bg-gray-50 border border-gray-200 text-gray-600 rounded hover:bg-gray-100 transition-all shadow-sm"
                                            >
                                                <div className="font-bold text-xs">今天不訂餐</div>
                                            </button>

                                            {vendors.map((v) => (
                                                <button
                                                    key={v.vendor.id}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        selectVendor(dateStr, v.vendor.id, v.vendor.name);
                                                    }}
                                                    className="w-full text-left p-1.5 bg-white border text-gray-800 rounded hover:opacity-80 transition-all shadow-sm group"
                                                    style={{ borderColor: v.vendor.color || '#BFDBFE' }}
                                                >
                                                    <div className="font-bold truncate text-gray-600">
                                                        {v.vendor.name} ({v.menu_items[0].name})
                                                    </div>
                                                    {v.menu_items[0] && (
                                                        <div className="flex justify-between items-center mt-0.5">
                                                            <span className="text-[10px] text-gray-500 truncate flex-1">

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
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-lg mb-2">
                                    已選擇 {Object.keys(selections).length} 天
                                </h3>
                            </div>
                            <button onClick={() => setSelections({})} className="text-sm text-red-500 hover:text-red-700">
                                清除全部選擇
                            </button>
                        </div>

                        <div className="text-sm text-gray-600 mb-4 max-h-40 overflow-y-auto">
                            {Object.values(selections).map((sel) => (
                                <div key={sel.date} className="flex justify-between border-b py-1">
                                    <span>{sel.date}</span>
                                    <span className={sel.is_no_order ? "text-gray-400" : "font-medium"}>
                                        {sel.vendor_name} - {sel.item_name}
                                    </span>
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
        </div >
    );
};
