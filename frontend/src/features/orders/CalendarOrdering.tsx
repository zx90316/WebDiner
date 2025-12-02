import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import * as timeService from "../../lib/timeService";
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
    item_description?: string;
    is_no_order?: boolean;
}

export const CalendarOrdering: React.FC = () => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selections, setSelections] = useState<{ [date: string]: DaySelection }>({});
    const [existingOrders, setExistingOrders] = useState<{ [date: string]: any }>({});
    const [availableVendors, setAvailableVendors] = useState<{ [date: string]: VendorWithMenu[] }>({});
    const [specialDays, setSpecialDays] = useState<{ [date: string]: boolean }>({});
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [expandedDate, setExpandedDate] = useState<string | null>(null);
    const [lastSelection, setLastSelection] = useState<DaySelection | null>(null);
    const { token } = useAuth();
    const { showToast } = useToast();

    useEffect(() => {
        loadExistingOrders();
    }, [currentMonth]);

    useEffect(() => {
        loadSpecialDays();
    }, []);

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

    // Group days into weeks for expandable row layout
    const getWeeks = (days: (Date | null)[]) => {
        const weeks: (Date | null)[][] = [];
        for (let i = 0; i < days.length; i += 7) {
            weeks.push(days.slice(i, i + 7));
        }
        // Pad the last week if needed
        if (weeks.length > 0) {
            const lastWeek = weeks[weeks.length - 1];
            while (lastWeek.length < 7) {
                lastWeek.push(null);
            }
        }
        return weeks;
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

    const loadSpecialDays = async () => {
        try {
            const days = await api.get("/orders/special_days", token!);
            const map: { [date: string]: boolean } = {};
            days.forEach((d: any) => {
                map[d.date] = d.is_holiday;
            });
            setSpecialDays(map);
        } catch (error) {
            console.error("Failed to load special days");
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

    const selectItem = (date: string, vendorId: number, vendorName: string, itemId: number, itemName: string, itemDescription: string, vendorColor: string) => {
        const newSelection: DaySelection = {
            date,
            vendor_id: vendorId,
            vendor_menu_item_id: itemId,
            vendor_name: vendorName,
            vendor_color: vendorColor,
            item_name: itemName,
            item_description: itemDescription,
            is_no_order: false,
        };
        setSelections((prev) => ({
            ...prev,
            [date]: newSelection,
        }));
        setLastSelection(newSelection);
    };

    const selectNoOrder = (date: string) => {
        const newSelection: DaySelection = {
            date,
            vendor_name: "不訂餐",
            item_name: "不訂餐",
            is_no_order: true,
        };
        setSelections((prev) => ({
            ...prev,
            [date]: newSelection,
        }));
        setLastSelection(newSelection);
    };

    const applySelectionToMonth = async (selection: DaySelection) => {
        const days = getCalendarDays();
        const newSelections = { ...selections };
        let count = 0;
        let skipped = 0;

        // 取得所有需要訂餐的日期
        const datesToProcess: string[] = [];
        days.forEach(day => {
            if (!day) return;
            const dateStr = formatDate(day);
            if (isDatePast(day) || isWeekend(day) || existingOrders[dateStr]) return;
            datesToProcess.push(dateStr);
        });

        // 批次載入所有日期的可用廠商
        const vendorPromises = datesToProcess.map(async (dateStr) => {
            if (!availableVendors[dateStr]) {
                try {
                    const vendors = await api.get(`/vendors/available/${dateStr}`, token!);
                    return { dateStr, vendors };
                } catch {
                    return { dateStr, vendors: [] };
                }
            }
            return { dateStr, vendors: availableVendors[dateStr] };
        });

        const vendorResults = await Promise.all(vendorPromises);
        const vendorMap: { [date: string]: VendorWithMenu[] } = {};
        vendorResults.forEach(result => {
            vendorMap[result.dateStr] = result.vendors;
        });

        // 根據描述匹配每個日期的品項
        datesToProcess.forEach(dateStr => {
            const vendors = vendorMap[dateStr] || [];
            
            // 找到同一廠商的品項
            let matchedItem: { vendorId: number; vendorName: string; vendorColor: string; itemId: number; itemName: string; itemDescription: string } | null = null;
            
            for (const v of vendors) {
                if (v.vendor.id !== selection.vendor_id) continue;
                
                // 1. 優先用 item.id 直接匹配（適用於每天供應的品項）
                for (const item of v.menu_items) {
                    if (item.id === selection.vendor_menu_item_id) {
                        matchedItem = {
                            vendorId: v.vendor.id,
                            vendorName: v.vendor.name,
                            vendorColor: v.vendor.color,
                            itemId: item.id,
                            itemName: item.name,
                            itemDescription: item.description,
                        };
                        break;
                    }
                }
                
                // 2. 如果 item.id 沒有匹配到，嘗試用 description 匹配（適用於每週不同的品項）
                if (!matchedItem && selection.item_description) {
                    for (const item of v.menu_items) {
                        if (item.description === selection.item_description) {
                            matchedItem = {
                                vendorId: v.vendor.id,
                                vendorName: v.vendor.name,
                                vendorColor: v.vendor.color,
                                itemId: item.id,
                                itemName: item.name,
                                itemDescription: item.description,
                            };
                            break;
                        }
                    }
                }
                
                if (matchedItem) break;
            }

            if (matchedItem) {
                newSelections[dateStr] = {
                    date: dateStr,
                    vendor_id: matchedItem.vendorId,
                    vendor_menu_item_id: matchedItem.itemId,
                    vendor_name: matchedItem.vendorName,
                    vendor_color: matchedItem.vendorColor,
                    item_name: matchedItem.itemName,
                    item_description: matchedItem.itemDescription,
                    is_no_order: false,
                };
                count++;
            } else if (selection.is_no_order) {
                // 不訂餐的情況
                newSelections[dateStr] = { ...selection, date: dateStr };
                count++;
            } else {
                skipped++;
            }
        });

        // 更新已載入的廠商資料到 state
        setAvailableVendors(prev => ({ ...prev, ...vendorMap }));
        setSelections(newSelections);
        
        if (skipped > 0) {
            showToast(`已套用到本月 ${count} 天，${skipped} 天無匹配品項已跳過`, "info");
        } else {
            showToast(`已套用到本月 ${count} 天`, "success");
        }
    };

    const applySelectionToQuarter = async (selection: DaySelection) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // 重置時間為 00:00:00
        const endDate = new Date(today.getFullYear(), today.getMonth() + 3 + 1, 0); // 往後推 3 個月的最後一天
        endDate.setHours(23, 59, 59, 999); // 確保包含最後一天
        const newSelections = { ...selections };
        let count = 0;
        let skipped = 0;

        // 取得所有需要訂餐的日期
        const datesToProcess: string[] = [];
        for (let date = new Date(today); date <= endDate; date.setDate(date.getDate() + 1)) {
            const currentDate = new Date(date);
            const dateStr = formatDate(currentDate);
            if (isDatePast(currentDate) || isWeekend(currentDate) || existingOrders[dateStr]) continue;
            datesToProcess.push(dateStr);
        }

        // 批次載入所有日期的可用廠商
        const vendorPromises = datesToProcess.map(async (dateStr) => {
            if (!availableVendors[dateStr]) {
                try {
                    const vendors = await api.get(`/vendors/available/${dateStr}`, token!);
                    return { dateStr, vendors };
                } catch {
                    return { dateStr, vendors: [] };
                }
            }
            return { dateStr, vendors: availableVendors[dateStr] };
        });

        const vendorResults = await Promise.all(vendorPromises);
        const vendorMap: { [date: string]: VendorWithMenu[] } = {};
        vendorResults.forEach(result => {
            vendorMap[result.dateStr] = result.vendors;
        });

        // 根據描述匹配每個日期的品項
        datesToProcess.forEach(dateStr => {
            const vendors = vendorMap[dateStr] || [];
            
            // 找到同一廠商的品項
            let matchedItem: { vendorId: number; vendorName: string; vendorColor: string; itemId: number; itemName: string; itemDescription: string } | null = null;
            
            for (const v of vendors) {
                if (v.vendor.id !== selection.vendor_id) continue;
                
                // 1. 優先用 item.id 直接匹配（適用於每天供應的品項）
                for (const item of v.menu_items) {
                    if (item.id === selection.vendor_menu_item_id) {
                        matchedItem = {
                            vendorId: v.vendor.id,
                            vendorName: v.vendor.name,
                            vendorColor: v.vendor.color,
                            itemId: item.id,
                            itemName: item.name,
                            itemDescription: item.description,
                        };
                        break;
                    }
                }
                
                // 2. 如果 item.id 沒有匹配到，嘗試用 description 匹配（適用於每週不同的品項）
                if (!matchedItem && selection.item_description) {
                    for (const item of v.menu_items) {
                        if (item.description === selection.item_description) {
                            matchedItem = {
                                vendorId: v.vendor.id,
                                vendorName: v.vendor.name,
                                vendorColor: v.vendor.color,
                                itemId: item.id,
                                itemName: item.name,
                                itemDescription: item.description,
                            };
                            break;
                        }
                    }
                }
                
                if (matchedItem) break;
            }

            if (matchedItem) {
                newSelections[dateStr] = {
                    date: dateStr,
                    vendor_id: matchedItem.vendorId,
                    vendor_menu_item_id: matchedItem.itemId,
                    vendor_name: matchedItem.vendorName,
                    vendor_color: matchedItem.vendorColor,
                    item_name: matchedItem.itemName,
                    item_description: matchedItem.itemDescription,
                    is_no_order: false,
                };
                count++;
            } else if (selection.is_no_order) {
                // 不訂餐的情況
                newSelections[dateStr] = { ...selection, date: dateStr };
                count++;
            } else {
                skipped++;
            }
        });

        // 更新已載入的廠商資料到 state
        setAvailableVendors(prev => ({ ...prev, ...vendorMap }));
        setSelections(newSelections);

        const endMonth = endDate.getMonth() + 1;
        if (skipped > 0) {
            showToast(`已套用到 ${endMonth} 月底，共 ${count} 天，${skipped} 天無匹配品項已跳過`, "info");
        } else {
            showToast(`已套用到 ${endMonth} 月底，共 ${count} 天`, "success");
        }
    };

    const applyWeekPatternToMonth = async () => {
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
        let skipped = 0;

        // 取得所有需要訂餐的日期
        const datesToProcess: { dateStr: string; dayOfWeek: number }[] = [];
        days.forEach(day => {
            if (!day) return;
            const dayOfWeek = day.getDay();
            const template = pattern[dayOfWeek];
            if (!template) return;

            const dateStr = formatDate(day);
            if (isDatePast(day) || isWeekend(day) || existingOrders[dateStr]) return;
            datesToProcess.push({ dateStr, dayOfWeek });
        });

        // 批次載入所有日期的可用廠商
        const vendorPromises = datesToProcess.map(async ({ dateStr }) => {
            if (!availableVendors[dateStr]) {
                try {
                    const vendors = await api.get(`/vendors/available/${dateStr}`, token!);
                    return { dateStr, vendors };
                } catch {
                    return { dateStr, vendors: [] };
                }
            }
            return { dateStr, vendors: availableVendors[dateStr] };
        });

        const vendorResults = await Promise.all(vendorPromises);
        const vendorMap: { [date: string]: VendorWithMenu[] } = {};
        vendorResults.forEach(result => {
            vendorMap[result.dateStr] = result.vendors;
        });

        // 根據描述匹配每個日期的品項
        datesToProcess.forEach(({ dateStr, dayOfWeek }) => {
            const template = pattern[dayOfWeek];
            const vendors = vendorMap[dateStr] || [];
            
            // 找到同一廠商的品項
            let matchedItem: { vendorId: number; vendorName: string; vendorColor: string; itemId: number; itemName: string; itemDescription: string } | null = null;
            
            for (const v of vendors) {
                if (v.vendor.id !== template.vendor_id) continue;
                
                // 1. 優先用 item.id 直接匹配（適用於每天供應的品項）
                for (const item of v.menu_items) {
                    if (item.id === template.vendor_menu_item_id) {
                        matchedItem = {
                            vendorId: v.vendor.id,
                            vendorName: v.vendor.name,
                            vendorColor: v.vendor.color,
                            itemId: item.id,
                            itemName: item.name,
                            itemDescription: item.description,
                        };
                        break;
                    }
                }
                
                // 2. 如果 item.id 沒有匹配到，嘗試用 description 匹配（適用於每週不同的品項）
                if (!matchedItem && template.item_description) {
                    for (const item of v.menu_items) {
                        if (item.description === template.item_description) {
                            matchedItem = {
                                vendorId: v.vendor.id,
                                vendorName: v.vendor.name,
                                vendorColor: v.vendor.color,
                                itemId: item.id,
                                itemName: item.name,
                                itemDescription: item.description,
                            };
                            break;
                        }
                    }
                }
                
                if (matchedItem) break;
            }

            if (matchedItem) {
                newSelections[dateStr] = {
                    date: dateStr,
                    vendor_id: matchedItem.vendorId,
                    vendor_menu_item_id: matchedItem.itemId,
                    vendor_name: matchedItem.vendorName,
                    vendor_color: matchedItem.vendorColor,
                    item_name: matchedItem.itemName,
                    item_description: matchedItem.itemDescription,
                    is_no_order: false,
                };
                count++;
            } else if (template.is_no_order) {
                // 不訂餐的情況
                newSelections[dateStr] = { ...template, date: dateStr };
                count++;
            } else {
                skipped++;
            }
        });

        // 更新已載入的廠商資料到 state
        setAvailableVendors(prev => ({ ...prev, ...vendorMap }));
        setSelections(newSelections);

        if (skipped > 0) {
            showToast(`已套用週範本到本月 ${count} 天，${skipped} 天無匹配品項已跳過`, "info");
        } else {
            showToast(`已套用週範本到本月 ${count} 天`, "success");
        }
    };

    const applyWeekPatternToQuarter = async () => {
        const pattern: { [dayOfWeek: number]: DaySelection } = {};
        Object.values(selections).forEach(sel => {
            const date = new Date(sel.date);
            pattern[date.getDay()] = sel;
        });

        if (Object.keys(pattern).length === 0) {
            showToast("請先選擇至少一天的餐點作為範本", "error");
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0); // 重置時間為 00:00:00
        const endDate = new Date(today.getFullYear(), today.getMonth() + 3 + 1, 0); // 往後推 3 個月的最後一天
        endDate.setHours(23, 59, 59, 999); // 確保包含最後一天
        const newSelections = { ...selections };
        let count = 0;
        let skipped = 0;

        // 取得所有需要訂餐的日期
        const datesToProcess: { dateStr: string; dayOfWeek: number }[] = [];
        for (let date = new Date(today); date <= endDate; date.setDate(date.getDate() + 1)) {
            const currentDate = new Date(date);
            const dayOfWeek = currentDate.getDay();
            const template = pattern[dayOfWeek];

            if (!template) continue;

            const dateStr = formatDate(currentDate);
            if (isDatePast(currentDate) || isWeekend(currentDate) || existingOrders[dateStr]) continue;
            datesToProcess.push({ dateStr, dayOfWeek });
        }

        // 批次載入所有日期的可用廠商
        const vendorPromises = datesToProcess.map(async ({ dateStr }) => {
            if (!availableVendors[dateStr]) {
                try {
                    const vendors = await api.get(`/vendors/available/${dateStr}`, token!);
                    return { dateStr, vendors };
                } catch {
                    return { dateStr, vendors: [] };
                }
            }
            return { dateStr, vendors: availableVendors[dateStr] };
        });

        const vendorResults = await Promise.all(vendorPromises);
        const vendorMap: { [date: string]: VendorWithMenu[] } = {};
        vendorResults.forEach(result => {
            vendorMap[result.dateStr] = result.vendors;
        });

        // 根據描述匹配每個日期的品項
        datesToProcess.forEach(({ dateStr, dayOfWeek }) => {
            const template = pattern[dayOfWeek];
            const vendors = vendorMap[dateStr] || [];
            
            // 找到同一廠商的品項
            let matchedItem: { vendorId: number; vendorName: string; vendorColor: string; itemId: number; itemName: string; itemDescription: string } | null = null;
            
            for (const v of vendors) {
                if (v.vendor.id !== template.vendor_id) continue;
                
                // 1. 優先用 item.id 直接匹配（適用於每天供應的品項）
                for (const item of v.menu_items) {
                    if (item.id === template.vendor_menu_item_id) {
                        matchedItem = {
                            vendorId: v.vendor.id,
                            vendorName: v.vendor.name,
                            vendorColor: v.vendor.color,
                            itemId: item.id,
                            itemName: item.name,
                            itemDescription: item.description,
                        };
                        break;
                    }
                }
                
                // 2. 如果 item.id 沒有匹配到，嘗試用 description 匹配（適用於每週不同的品項）
                if (!matchedItem && template.item_description) {
                    for (const item of v.menu_items) {
                        if (item.description === template.item_description) {
                            matchedItem = {
                                vendorId: v.vendor.id,
                                vendorName: v.vendor.name,
                                vendorColor: v.vendor.color,
                                itemId: item.id,
                                itemName: item.name,
                                itemDescription: item.description,
                            };
                            break;
                        }
                    }
                }
                
                if (matchedItem) break;
            }

            if (matchedItem) {
                newSelections[dateStr] = {
                    date: dateStr,
                    vendor_id: matchedItem.vendorId,
                    vendor_menu_item_id: matchedItem.itemId,
                    vendor_name: matchedItem.vendorName,
                    vendor_color: matchedItem.vendorColor,
                    item_name: matchedItem.itemName,
                    item_description: matchedItem.itemDescription,
                    is_no_order: false,
                };
                count++;
            } else if (template.is_no_order) {
                // 不訂餐的情況
                newSelections[dateStr] = { ...template, date: dateStr };
                count++;
            } else {
                skipped++;
            }
        });

        // 更新已載入的廠商資料到 state
        setAvailableVendors(prev => ({ ...prev, ...vendorMap }));
        setSelections(newSelections);

        const endMonth = endDate.getMonth() + 1;
        if (skipped > 0) {
            showToast(`已套用週範本到 ${endMonth} 月底，共 ${count} 天，${skipped} 天無匹配品項已跳過`, "info");
        } else {
            showToast(`已套用週範本到 ${endMonth} 月底，共 ${count} 天`, "success");
        }
    };

    const [clearRange, setClearRange] = useState<{ start: string, end: string }>({ start: "", end: "" });
    const [showClearModal, setShowClearModal] = useState(false);

    // 計算本月日期範圍
    const getMonthRange = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        return {
            start: formatDate(firstDay),
            end: formatDate(lastDay)
        };
    };

    // 打開清空訂單 Modal 時預設為本月範圍
    const openClearModal = () => {
        const monthRange = getMonthRange(currentMonth);
        setClearRange(monthRange);
        setShowClearModal(true);
    };

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

    // Helper functions - 使用統一的時間服務
    const isDatePast = (date: Date) => {
        return timeService.isDatePast(date);
    };

    const isWeekend = (date: Date) => {
        const dateStr = formatDate(date);
        if (specialDays[dateStr] !== undefined) {
            return specialDays[dateStr];
        }
        return date.getDay() === 0 || date.getDay() === 6;
    };

    const clearSelection = (date: string) => {
        setSelections((prev) => {
            const newSelections = { ...prev };
            delete newSelections[date];
            return newSelections;
        });
    };

    // Handle date click - expand panel and load vendors
    const handleDateClick = async (dateStr: string) => {
        if (expandedDate === dateStr) {
            // Clicking same date closes the panel
            setExpandedDate(null);
        } else {
            setExpandedDate(dateStr);
            // Load vendors if not already loaded
            if (!availableVendors[dateStr]) {
                await loadVendorsForDate(dateStr);
            }
        }
    };

    // Handle item selection - select and close panel
    const handleSelectItem = (dateStr: string, vendorId: number, vendorName: string, itemId: number, itemName: string, itemDescription: string, vendorColor: string) => {
        selectItem(dateStr, vendorId, vendorName, itemId, itemName, itemDescription, vendorColor);
        setExpandedDate(null);
    };

    // Handle no order selection - select and close panel
    const handleSelectNoOrder = (dateStr: string) => {
        selectNoOrder(dateStr);
        setExpandedDate(null);
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
        const ordersToCreate = Object.values(selections).map((sel) => ({
            order_date: sel.date,
            vendor_id: sel.vendor_id,
            vendor_menu_item_id: sel.vendor_menu_item_id,
            is_no_order: sel.is_no_order
        }));

        if (ordersToCreate.length === 0) {
            showToast("請先選擇要訂餐的日期", "info");
            return;
        }

        try {
            setSubmitting(true);
            const result = await api.post("/orders/batch", { orders: ordersToCreate }, token!);
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
    const weeks = getWeeks(days);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekDays = ["日", "一", "二", "三", "四", "五", "六"];

    // Get day name for display
    const getDayName = (dateStr: string) => {
        const date = new Date(dateStr);
        const dayNames = ["日", "一", "二", "三", "四", "五"];
        return dayNames[date.getDay()];
    };

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
                    <button 
                        onClick={() => lastSelection && applySelectionToMonth(lastSelection)} 
                        disabled={!lastSelection}
                        className={`text-xs px-2 py-1 rounded transition ${lastSelection ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                        title={lastSelection ? `套用「${lastSelection.vendor_name} - ${lastSelection.item_name}」到本月` : '請先選擇一個餐點'}
                    >
                        單日 → 本月 {lastSelection && <span className="text-[10px] opacity-70">{lastSelection.vendor_name + " - " + (lastSelection.item_description? lastSelection.item_description + " (" + lastSelection.item_name + ")" : lastSelection.item_name)}</span>}
                    </button>
                    <button 
                        onClick={() => lastSelection && applySelectionToQuarter(lastSelection)} 
                        disabled={!lastSelection}
                        className={`text-xs px-2 py-1 rounded transition ${lastSelection ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                        title={lastSelection ? `套用「${lastSelection.vendor_name} - ${lastSelection.item_name}」到季（往後3個月）` : '請先選擇一個餐點'}
                    >
                        單日 → 季 {lastSelection && <span className="text-[10px] opacity-70">{lastSelection.vendor_name + " - " + (lastSelection.item_description? lastSelection.item_description + " (" + lastSelection.item_name + ")" : lastSelection.item_name)}</span>}
                    </button>
                    <button onClick={applyWeekPatternToMonth} className="text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded hover:bg-purple-100">
                        本週設定 → 本月
                    </button>
                    <button onClick={applyWeekPatternToQuarter} className="text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded hover:bg-purple-100">
                        本週設定 → 季
                    </button>
                    <button onClick={openClearModal} className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded text-sm transition">
                        清空訂單
                    </button>
                </div>

                {/* Clear Modal */}
                {showClearModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
                            <h3 className="font-bold text-lg mb-4">清空訂單</h3>
                            <div className="space-y-4">
                                {/* 快速選擇按鈕 */}
                                <div>
                                    <label className="block text-sm text-gray-600 mb-2">快速選擇</label>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => setClearRange(getMonthRange(currentMonth))}
                                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded text-sm transition"
                                        >
                                            本月
                                        </button>
                                        <button
                                            onClick={() => setClearRange(getMonthRange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)))}
                                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded text-sm transition"
                                        >
                                            下個月
                                        </button>
                                        <button
                                            onClick={() => {
                                                const now = new Date();
                                                const endOfYear = new Date(now.getFullYear(), 11, 31);
                                                setClearRange({
                                                    start: formatDate(now),
                                                    end: formatDate(endOfYear)
                                                });
                                            }}
                                            className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded text-sm transition"
                                        >
                                            今年剩餘
                                        </button>
                                    </div>
                                </div>
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

                    {/* Calendar Grid - Organized by Weeks */}
                    <div className="space-y-1">
                        {weeks.map((week, weekIndex) => {
                            // Check if any day in this week is expanded
                            const expandedDayInWeek = week.find(day => day && formatDate(day) === expandedDate);
                            const expandedDateStr = expandedDayInWeek ? formatDate(expandedDayInWeek) : null;
                            const expandedVendors = expandedDateStr ? availableVendors[expandedDateStr] || [] : [];

                            return (
                                <div key={`week-${weekIndex}`}>
                                    {/* Week Row */}
                                    <div className="grid grid-cols-7 gap-2">
                                        {week.map((day, dayIndex) => {
                                            if (!day) {
                                                return <div key={`empty-${weekIndex}-${dayIndex}`} className="aspect-square" />;
                                            }

                                            const dateStr = formatDate(day);
                                            const isExpanded = expandedDate === dateStr;

                                            // Check if date is past (使用台灣時區)
                                            const isPast = isDatePast(day);

                                            const isDayWeekend = isWeekend(day);
                                            const hasOrder = existingOrders[dateStr];
                                            const hasSelection = selections[dateStr];

                                            // Find vendor color for existing order
                                            let existingOrderColor = "#10B981";
                                            let existingOrderBorder = "#34D399";

                                            if (hasOrder) {
                                                if (hasOrder.vendor_color) {
                                                    existingOrderColor = hasOrder.vendor_color;
                                                    existingOrderBorder = hasOrder.vendor_color;
                                                }
                                            }

                                            // Find vendor color for selection
                                            let selectionColor = "#3B82F6";
                                            let selectionBorder = "#60A5FA";

                                            if (hasSelection && hasSelection.vendor_color) {
                                                selectionColor = hasSelection.vendor_color;
                                                selectionBorder = hasSelection.vendor_color;
                                            }

                                            const canModify = !isPast && !isDayWeekend;
                                            const canClick = canModify && !hasOrder;

                                            return (
                                                <div
                                                    key={dateStr}
                                                    className={`aspect-[1/2.5] sm:aspect-square border-2 rounded-lg p-1 sm:p-1.5 transition-all relative flex flex-col
                                                        ${isPast || isDayWeekend
                                                            ? "bg-gray-100 opacity-50 cursor-not-allowed border-gray-200"
                                                            : hasOrder
                                                                ? "cursor-default"
                                                                : hasSelection
                                                                    ? "cursor-pointer hover:shadow-md"
                                                                    : isExpanded
                                                                        ? "bg-blue-50 border-blue-400 shadow-md cursor-pointer"
                                                                        : "bg-white hover:shadow-md hover:border-blue-300 cursor-pointer"
                                                        }`}
                                                    style={
                                                        hasOrder
                                                            ? { borderColor: existingOrderBorder, backgroundColor: `${existingOrderColor}10` }
                                                            : hasSelection
                                                                ? { borderColor: selectionBorder, backgroundColor: `${selectionColor}10` }
                                                                : {}
                                                    }
                                                    onClick={() => canClick && handleDateClick(dateStr)}
                                                >
                                                    {/* Header: Date + Status Icon */}
                                                    <div className="flex items-start justify-between">
                                                        {/* Date Number */}
                                                        <span className={`text-sm sm:text-base font-bold ${isExpanded ? "text-blue-600" : ""}`}>
                                                            {day.getDate()}
                                                        </span>
                                                        
                                                        {/* Status Icon */}
                                                        {hasOrder && (
                                                            <div
                                                                className="w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center flex-shrink-0"
                                                                style={{ backgroundColor: existingOrderColor }}
                                                            >
                                                                <span className="text-white text-[10px] sm:text-xs">✓</span>
                                                            </div>
                                                        )}
                                                        {!hasOrder && hasSelection && (
                                                            <div
                                                                className="w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center border-2 flex-shrink-0"
                                                                style={{ borderColor: selectionColor, backgroundColor: `${selectionColor}20` }}
                                                            >
                                                                <span style={{ color: selectionColor }} className="text-[10px] sm:text-xs">●</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Content Area */}
                                                    <div className="flex-1 flex flex-col justify-center overflow-hidden">
                                                        {/* Weekend/Past indicator */}
                                                        {isDayWeekend && (
                                                            <span className="text-[10px] sm:text-xs text-gray-400 text-center">休</span>
                                                        )}

                                                        {/* Existing Order Info */}
                                                        {hasOrder && (
                                                            <div className="text-center">
                                                                <p className="text-[10px] sm:text-[20px] text-gray-600 leading-tight break-words">
                                                                    {hasOrder.vendor_name}
                                                                </p>
                                                                <p className="text-[7px] sm:text-[18px] text-gray-500 leading-tight break-words">
                                                                    {hasOrder.menu_item_description ? hasOrder.menu_item_description + " (" + hasOrder.menu_item_name + ")" : hasOrder.menu_item_name}
                                                                </p>
                                                                {canModify && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            cancelOrder(hasOrder.id);
                                                                        }}
                                                                        className="text-[8px] sm:text-[20px] text-red-500 hover:text-red-700"
                                                                    >
                                                                        取消
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                        
                                                        {/* Selection Info */}
                                                        {!hasOrder && hasSelection && (
                                                            <div className="text-center">
                                                                <p className="text-[8px] sm:text-[20px] leading-tight break-words" style={{ color: selectionColor }}>
                                                                    {hasSelection.vendor_name}
                                                                </p>
                                                                <p className="text-[7px] sm:text-[18px] text-gray-500 leading-tight break-words">
                                                                    {hasSelection.item_description ? hasSelection.item_description + " (" + hasSelection.item_name + ")" : hasSelection.item_name}
                                                                </p>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        clearSelection(dateStr);
                                                                    }}
                                                                    className="text-[8px] sm:text-[20px] text-red-500 hover:text-red-700"
                                                                >
                                                                    取消
                                                                </button>
                                                            </div>
                                                        )}

                                                        {/* Empty state - add button */}
                                                        {!hasOrder && !hasSelection && canModify && (
                                                            <div className="flex justify-center">
                                                                <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center transition-colors
                                                                    ${isExpanded ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-400 hover:bg-blue-100 hover:text-blue-500"}`}>
                                                                    <span className="text-sm sm:text-base">{isExpanded ? "−" : "+"}</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Expandable Panel */}
                                    <div
                                        className={`transition-all duration-300 ease-in-out ${expandedDateStr ? "opacity-100" : "max-h-0 opacity-0 overflow-hidden"}`}
                                    >
                                        {expandedDateStr && (
                                            <div className="bg-gradient-to-b from-blue-50 to-white border-2 border-blue-200 rounded-lg mt-2 p-4 shadow-lg">
                                                {/* Panel Header */}
                                                <div className="flex justify-between items-center mb-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-lg">📅</span>
                                                        <h3 className="font-bold text-gray-800">
                                                            {expandedDateStr} (週{getDayName(expandedDateStr)}) 的餐點選擇
                                                        </h3>
                                                    </div>
                                                    <button
                                                        onClick={() => setExpandedDate(null)}
                                                        className="p-1.5 hover:bg-gray-200 rounded-full transition-colors"
                                                    >
                                                        <span className="text-gray-500 text-lg">✕</span>
                                                    </button>
                                                </div>

                                                {/* Menu Items Grid */}
                                                {expandedVendors.length > 0 ? (
                                                    <div className="space-y-4">
                                                        {/* Vendor grouped items */}
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                                            {expandedVendors.flatMap(v =>
                                                                v.menu_items.map(item => ({
                                                                    vendor: v.vendor,
                                                                    item
                                                                }))
                                                            ).map(({ vendor, item }) => (
                                                                <button
                                                                    key={`${vendor.id}-${item.id}`}
                                                                    onClick={() => handleSelectItem(expandedDateStr, vendor.id, vendor.name, item.id, item.name, item.description, vendor.color)}
                                                                    className="w-full text-left bg-white rounded-lg border-l-4 shadow-sm hover:shadow-md transition-all p-3 group"
                                                                    style={{ borderLeftColor: vendor.color || '#3B82F6' }}
                                                                >
                                                                    {/* Vendor Name */}
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <div
                                                                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                                            style={{ backgroundColor: vendor.color || '#3B82F6' }}
                                                                        />
                                                                        <span className="text-xs font-medium text-gray-500">{vendor.name}</span>
                                                                    </div>
                                                                    {/* Item Name */}
                                                                    <h4 className="font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                                                                        {item.description? item.description + " (" + item.name + ")" : item.name}
                                                                    </h4>
                                                                </button>
                                                            ))}
                                                        </div>

                                                        {/* No Order Button */}
                                                        <button
                                                            onClick={() => handleSelectNoOrder(expandedDateStr)}
                                                            className="w-full p-3 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 hover:border-gray-400 transition-all"
                                                        >
                                                            <span className="font-medium">🚫 今天不訂餐</span>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-8 text-gray-500">
                                                        <div className="animate-spin inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mb-2"></div>
                                                        <p>載入中...</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
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
