import React, { useEffect, useState, useMemo } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../../components/Toast";
import { Loading } from "../../components/Loading";

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

// 完整菜單項目（包含 weekday）
interface FullMenuItem {
    id: number;
    name: string;
    description: string;
    price: number;
    weekday: number | null; // 0-4 for Mon-Fri, null for all days
}

interface VendorWithFullMenu {
    id: number;
    name: string;
    description: string;
    color: string;
    menu_items: FullMenuItem[];
}

interface MealOption {
    vendor_id: number;
    vendor_name: string;
    vendor_color: string;
    item_id: number;
    item_name: string;
    item_description: string;
}

interface DayOrder {
    date: string;
    dayOfWeek: string;
    isPast: boolean;
    isWeekend: boolean;
    existingOrder?: {
        id: number;
        vendor_id: number;
        vendor_name: string;
        menu_item_name: string;
        is_no_order?: boolean;
    };
    selectedMealIndex?: number; // Index of selected meal option
}

export const LegacyCalendarOrdering: React.FC = () => {
    const currentDate = new Date();
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
    const [availableVendors, setAvailableVendors] = useState<VendorWithMenu[]>([]);
    const [vendorsWithFullMenu, setVendorsWithFullMenu] = useState<VendorWithFullMenu[]>([]); // 完整菜單
    const [dayOrders, setDayOrders] = useState<DayOrder[]>([]);
    const [existingOrders, setExistingOrders] = useState<{ [date: string]: any }>({});
    const [specialDays, setSpecialDays] = useState<{ [date: string]: boolean }>({});
    const [selectedMealType, setSelectedMealType] = useState<number | null>(null); // 單選
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [cancellingAll, setCancellingAll] = useState(false); // 取消全月訂餐中

    const { token, user } = useAuth();
    const { showToast } = useToast();

    const weekDayNames = ["日", "一", "二", "三", "四", "五", "六"];
    const weekDayNamesShort = ["一", "二", "三", "四", "五"]; // 週一到週五

    // Generate year options (current year and next year)
    const yearOptions = useMemo(() => {
        const years = [];
        for (let y = currentDate.getFullYear(); y <= currentDate.getFullYear() + 1; y++) {
            years.push(y);
        }
        return years;
    }, [currentDate]);

    // Generate month options
    const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);

    // Load all vendors/menu items for the month
    useEffect(() => {
        loadVendorsForMonth();
        loadAllVendorsWithFullMenu();
        loadExistingOrders();
        loadSpecialDays();
    }, [selectedYear, selectedMonth]);

    // Generate day orders when vendors or existing orders change
    useEffect(() => {
        generateDayOrders();
    }, [selectedYear, selectedMonth, availableVendors, existingOrders, specialDays]);

    const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const loadVendorsForMonth = async () => {
        try {
            setLoading(true);
            // Load vendors for first day of month (assuming same vendors available all month)
            const firstDay = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
            const vendors = await api.get(`/vendors/available/${firstDay}`, token!);
            setAvailableVendors(vendors);
        } catch (error) {
            console.error("Failed to load vendors", error);
            showToast("載入廠商失敗", "error");
        } finally {
            setLoading(false);
        }
    };

    // 載入所有廠商的完整菜單（包含 weekday 資訊）
    const loadAllVendorsWithFullMenu = async () => {
        try {
            // 先獲取所有廠商
            const vendors = await api.get("/vendors/", token!);
            
            // 對每個廠商載入完整菜單
            const vendorsWithMenus: VendorWithFullMenu[] = await Promise.all(
                vendors.map(async (vendor: { id: number; name: string; description: string; color: string }) => {
                    const menuItems = await api.get(`/vendors/${vendor.id}/menu`, token!);
                    return {
                        ...vendor,
                        menu_items: menuItems,
                    };
                })
            );
            
            setVendorsWithFullMenu(vendorsWithMenus);
        } catch (error) {
            console.error("Failed to load full vendor menus", error);
        }
    };

    const loadExistingOrders = async () => {
        try {
            const orders = await api.get("/orders/", token!);
            const ordersMap: { [date: string]: any } = {};
            orders.forEach((order: any) => {
                ordersMap[order.order_date] = order;
            });
            setExistingOrders(ordersMap);
        } catch (error) {
            showToast("載入訂單失敗", "error");
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

    const isWeekend = (date: Date) => {
        const dateStr = formatDate(date);
        if (specialDays[dateStr] !== undefined) {
            return specialDays[dateStr];
        }
        return date.getDay() === 0 || date.getDay() === 6;
    };

    const generateDayOrders = () => {
        const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
        const days: DayOrder[] = [];

        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(selectedYear, selectedMonth - 1, d);
            const dateStr = formatDate(date);
            const dayOfWeek = weekDayNames[date.getDay()];
            const isPast = isDatePast(date);
            const weekend = isWeekend(date);

            // Skip weekends
            if (weekend) continue;

            const existing = existingOrders[dateStr];

            days.push({
                date: dateStr,
                dayOfWeek,
                isPast,
                isWeekend: weekend,
                existingOrder: existing ? {
                    id: existing.id,
                    vendor_id: existing.vendor_id,
                    vendor_name: existing.vendor_name || "不訂餐",
                    menu_item_name: existing.menu_item_name || "不訂餐",
                    is_no_order: existing.is_no_order
                } : undefined,
            });
        }

        setDayOrders(days);
    };

    // Flatten vendors to meal options
    const mealOptions: MealOption[] = useMemo(() => {
        const options: MealOption[] = [];
        availableVendors.forEach(v => {
            v.menu_items.forEach(item => {
                options.push({
                    vendor_id: v.vendor.id,
                    vendor_name: v.vendor.name,
                    vendor_color: v.vendor.color,
                    item_id: item.id,
                    item_name: item.name,
                    item_description: item.description,
                });
            });
        });
        return options;
    }, [availableVendors]);

    // 單選餐點類型
    const selectMealType = (index: number) => {
        setSelectedMealType(prev => prev === index ? null : index);
    };

    // 全月訂餐 - 可以取代已儲存的訂單（除了已過期的）
    const selectAllForMonth = async () => {
        if (selectedMealType === null) {
            showToast("請先選擇訂餐方式", "error");
            return;
        }

        const meal = mealOptions[selectedMealType];
        if (!meal) {
            showToast("選擇的餐點無效", "error");
            return;
        }

        // 找出需要刪除的已存在訂單（未過期的）
        const ordersToDelete = dayOrders
            .filter(day => !day.isPast && day.existingOrder)
            .map(day => day.existingOrder!.id);

        // 找出所有未過期的日期
        const datesToOrder = dayOrders
            .filter(day => !day.isPast)
            .map(day => day.date);

        if (datesToOrder.length === 0) {
            showToast("本月沒有可訂餐的日期", "info");
            return;
        }

        try {
            setSubmitting(true);

            // 1. 先刪除已存在的訂單
            if (ordersToDelete.length > 0) {
                await Promise.all(ordersToDelete.map(id => api.delete(`/orders/${id}`, token!)));
            }

            // 2. 建立新訂單
            const ordersToCreate = datesToOrder.map(date => ({
                order_date: date,
                vendor_id: meal.vendor_id,
                vendor_menu_item_id: meal.item_id,
                is_no_order: false,
            }));

            const result = await api.post("/orders/batch", { orders: ordersToCreate }, token!);
            
            showToast(`成功訂餐 ${result.length} 天${ordersToDelete.length > 0 ? `（已取代 ${ordersToDelete.length} 筆原訂單）` : ""}`, "success");
            
            // 清除選擇並重新載入
            setDayOrders(prev => prev.map(day => ({ ...day, selectedMealIndex: undefined })));
            loadExistingOrders();
        } catch (error: any) {
            showToast(error.message || "全月訂餐失敗", "error");
        } finally {
            setSubmitting(false);
        }
    };

    // 取消全月訂餐 - 取消已儲存的訂單（除了已過期的）
    const cancelAllForMonth = async () => {
        // 找出所有未過期且已存在的訂單
        const ordersToCancel = dayOrders
            .filter(day => !day.isPast && day.existingOrder)
            .map(day => day.existingOrder!.id);

        if (ordersToCancel.length === 0) {
            showToast("本月沒有可取消的訂單", "info");
            return;
        }

        if (!confirm(`確定要取消本月 ${ordersToCancel.length} 筆訂單嗎？`)) {
            return;
        }

        try {
            setCancellingAll(true);
            
            await Promise.all(ordersToCancel.map(id => api.delete(`/orders/${id}`, token!)));
            
            showToast(`已取消 ${ordersToCancel.length} 筆訂單`, "success");
            loadExistingOrders();
        } catch (error: any) {
            showToast(error.message || "取消訂單失敗", "error");
        } finally {
            setCancellingAll(false);
        }
    };

    const toggleDayMeal = (dateStr: string, mealIndex: number) => {
        setDayOrders(prev => prev.map(day => {
            if (day.date !== dateStr) return day;
            if (day.isPast || day.existingOrder) return day;

            // Toggle: if same meal is selected, unselect; otherwise select new meal
            const newIndex = day.selectedMealIndex === mealIndex ? undefined : mealIndex;
            return { ...day, selectedMealIndex: newIndex };
        }));
    };

    const cancelExistingOrder = async (orderId: number) => {
        try {
            await api.delete(`/orders/${orderId}`, token!);
            showToast("訂單已取消", "success");
            loadExistingOrders();
        } catch (error: any) {
            showToast(error.message || "取消訂單失敗", "error");
        }
    };

    const submitOrders = async () => {
        const ordersToCreate = dayOrders
            .filter(day => day.selectedMealIndex !== undefined && !day.existingOrder && !day.isPast)
            .map(day => {
                const meal = mealOptions[day.selectedMealIndex!];
                return {
                    order_date: day.date,
                    vendor_id: meal.vendor_id,
                    vendor_menu_item_id: meal.item_id,
                    is_no_order: false,
                };
            });

        if (ordersToCreate.length === 0) {
            showToast("請先選擇要訂餐的日期", "info");
            return;
        }

        try {
            setSubmitting(true);
            const result = await api.post("/orders/batch", { orders: ordersToCreate }, token!);
            showToast(`成功儲存 ${result.length} 天的餐點`, "success");
            // Clear selections and reload
            setDayOrders(prev => prev.map(day => ({ ...day, selectedMealIndex: undefined })));
            loadExistingOrders();
        } catch (error: any) {
            showToast(error.message || "批量儲存失敗", "error");
        } finally {
            setSubmitting(false);
        }
    };

    const hasNewSelections = dayOrders.some(day => day.selectedMealIndex !== undefined && !day.existingOrder && !day.isPast);

    if (loading) return <Loading fullScreen />;

    return (
        <div className="min-h-screen" style={{ background: "#f5f5f5", fontFamily: "'新細明體', Arial, sans-serif" }}>
            <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
                {/* Header */}
                <div style={{
                    background: "linear-gradient(180deg, #4a90d9 0%, #357abd 100%)",
                    padding: "10px 20px",
                    borderRadius: "4px 4px 0 0",
                    marginBottom: "0"
                }}>
                    <h1 style={{ color: "white", fontSize: "16px", fontWeight: "bold", margin: 0 }}>
                        查詢條件
                    </h1>
                </div>

                {/* Query Section */}
                <div style={{
                    background: "white",
                    border: "1px solid #ddd",
                    borderTop: "none",
                    padding: "20px",
                    marginBottom: "20px"
                }}>
                    {/* Year/Month Selection */}
                    <div style={{ marginBottom: "15px" }}>
                        <span style={{ marginRight: "10px" }}>年度:</span>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            style={{
                                padding: "4px 8px",
                                border: "1px solid #ccc",
                                borderRadius: "3px",
                                marginRight: "20px"
                            }}
                        >
                            {yearOptions.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                        <span style={{ marginRight: "10px" }}>月份:</span>
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                            style={{
                                padding: "4px 8px",
                                border: "1px solid #ccc",
                                borderRadius: "3px"
                            }}
                        >
                            {monthOptions.map(m => (
                                <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                            ))}
                        </select>
                    </div>

                    {/* Meal Type Selection - 單選 */}
                    <div style={{ marginBottom: "15px" }}>
                        <div style={{ marginBottom: "8px", fontWeight: "bold" }}>訂餐方式</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "10px" }}>
                            {mealOptions.map((meal, index) => (
                                <label 
                                    key={index} 
                                    style={{ 
                                        display: "flex", 
                                        alignItems: "center", 
                                        cursor: "pointer",
                                        padding: "6px 10px",
                                        border: `1px solid ${selectedMealType === index ? meal.vendor_color || "#4a90d9" : "#ddd"}`,
                                        borderRadius: "4px",
                                        background: selectedMealType === index ? "#f0f7ff" : "#fff",
                                        transition: "all 0.2s"
                                    }}
                                >
                                    <input
                                        type="radio"
                                        name="mealType"
                                        checked={selectedMealType === index}
                                        onChange={() => selectMealType(index)}
                                        style={{ marginRight: "8px" }}
                                    />
                                    <span>
                                        <span style={{ fontWeight: "bold", color: meal.vendor_color || "#333" }}>
                                            {meal.vendor_name}
                                        </span>
                                        <span style={{ color: "#666", fontSize: "12px", marginLeft: "4px" }}>
                                            {meal.item_description? meal.item_description : meal.item_name}
                                        </span>
                                    </span>
                                </label>
                            ))}
                        </div>
                        <div style={{ marginBottom: "15px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                            <button
                                onClick={selectAllForMonth}
                                disabled={submitting || selectedMealType === null}
                                style={{
                                    padding: "8px 20px",
                                    border: "1px solid #4cae4c",
                                    borderRadius: "3px",
                                    background: submitting || selectedMealType === null ? "#ccc" : "linear-gradient(180deg, #5cb85c 0%, #4cae4c 100%)",
                                    color: "white",
                                    cursor: submitting || selectedMealType === null ? "not-allowed" : "pointer",
                                    fontWeight: "bold"
                                }}
                            >
                                {submitting ? "處理中..." : "全月訂餐"}
                            </button>
                            <button
                                onClick={cancelAllForMonth}
                                disabled={cancellingAll}
                                style={{
                                    padding: "8px 20px",
                                    border: "1px solid #d9534f",
                                    borderRadius: "3px",
                                    background: cancellingAll ? "#ccc" : "linear-gradient(180deg, #d9534f 0%, #c9302c 100%)",
                                    color: "white",
                                    cursor: cancellingAll ? "not-allowed" : "pointer",
                                    fontWeight: "bold"
                                }}
                            >
                                {cancellingAll ? "取消中..." : "取消全月訂餐"}
                            </button>
                            <span style={{ 
                                fontSize: "12px", 
                                color: "#666", 
                                alignSelf: "center",
                                marginLeft: "10px"
                            }}>
                                ※ 全月訂餐會取代本月已訂餐項目
                            </span>
                        </div>
                        {hasNewSelections && (
                            <button
                                onClick={submitOrders}
                                disabled={submitting}
                                style={{
                                    padding: "8px 24px",
                                    background: submitting ? "#aaa" : "linear-gradient(180deg, #5cb85c 0%, #4cae4c 100%)",
                                    color: "white",
                                    border: "1px solid #4cae4c",
                                    borderRadius: "3px",
                                    cursor: submitting ? "not-allowed" : "pointer",
                                    fontWeight: "bold"
                                }}
                            >
                                {submitting ? "送出中..." : "確認送出"}
                            </button>
                        )}
                    </div>

                    <hr style={{ margin: "20px 0", borderColor: "#ddd" }} />

                    {/* Meal Description Table - 按廠商分組顯示 */}
                    <div style={{ background: "#eee", padding: "10px" }}>
                        <table style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            fontSize: "13px"
                        }}>
                            <thead>
                                <tr>
                                    <th style={{
                                        border: "1px solid #ccc",
                                        padding: "8px",
                                        background: "#f5f5f5",
                                        textAlign: "left",
                                        width: "70%"
                                    }}>
                                        <strong>{selectedYear}年{selectedMonth}月訂餐方式說明:</strong>
                                    </th>
                                    <th style={{
                                        border: "1px solid #ccc",
                                        padding: "8px",
                                        background: "#f5f5f5",
                                        textAlign: "center",
                                        width: "30%"
                                    }}>
                                        <strong>供應廠商</strong>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {vendorsWithFullMenu.map((vendor) => {
                                    // 分離每日供應和特定日期的品項
                                    const dailyItems = vendor.menu_items.filter(item => item.weekday === null);
                                    const weekdayItems = vendor.menu_items.filter(item => item.weekday !== null);
                                    
                                    // 按品項類型（description）分組，然後按星期排序
                                    const itemsByCategory: { [category: string]: { weekday: number; name: string }[] } = {};
                                    weekdayItems.forEach(item => {
                                        const category = item.description || item.name;
                                        if (!itemsByCategory[category]) {
                                            itemsByCategory[category] = [];
                                        }
                                        itemsByCategory[category].push({
                                            weekday: item.weekday!,
                                            name: item.name
                                        });
                                    });
                                    
                                    // 對每個類別內的品項按星期排序
                                    Object.keys(itemsByCategory).forEach(category => {
                                        itemsByCategory[category].sort((a, b) => a.weekday - b.weekday);
                                    });
                                    
                                    const hasWeekdayItems = weekdayItems.length > 0;
                                    const categories = Object.keys(itemsByCategory);
                                    
                                    return (
                                        <tr key={vendor.id}>
                                            <td style={{ border: "1px solid #ccc", padding: "8px", background: "white", verticalAlign: "top" }}>
                                                {/* 每天供應的品項 */}
                                                {dailyItems.length > 0 && (
                                                    <div style={{ marginBottom: hasWeekdayItems ? "10px" : "0" }}>
                                                        <div style={{ fontWeight: "bold", color: "#333", marginBottom: "4px" }}>
                                                            📅 每天供應
                                                        </div>
                                                        {dailyItems.map((item, idx) => (
                                                            <div key={idx} style={{ paddingLeft: "20px", marginBottom: "2px" }}>
                                                                • {item.name}
                                                                {item.description && (
                                                                    <span style={{ color: "#666", marginLeft: "8px" }}>
                                                                        ({item.description})
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                
                                                {/* 特定星期的品項 - 按品項類型分組 */}
                                                {hasWeekdayItems && (
                                                    <div>
                                                        <div style={{ fontWeight: "bold", color: "#333", marginBottom: "4px" }}>
                                                            📆 每週品項
                                                        </div>
                                                        <table style={{ 
                                                            borderCollapse: "collapse", 
                                                            width: "100%",
                                                            background: "#ffffff",
                                                            border: "1px solid #ddd",
                                                            marginLeft: "20px",
                                                            maxWidth: "calc(100% - 20px)"
                                                        }}>
                                                            <tbody>
                                                                {categories.map((category) => {
                                                                    const items = itemsByCategory[category];
                                                                    // 生成星期一~N依序的品項列表
                                                                    const itemNames = items.map(item => item.name);
                                                                    const weekdayCount = items.length;
                                                                    const weekdayLabel = weekdayCount === 5 
                                                                        ? "星期一~五" 
                                                                        : `星期${weekDayNamesShort.slice(0, weekdayCount).join("、")}`;
                                                                    
                                                                    return (
                                                                        <tr key={category}>
                                                                            <td style={{ 
                                                                                padding: "6px 10px", 
                                                                                borderBottom: "1px solid #eee",
                                                                                width: "80px",
                                                                                fontWeight: "bold",
                                                                                color: "#000",
                                                                                background: "#f0f0f0",
                                                                                whiteSpace: "nowrap"
                                                                            }}>
                                                                                {category}
                                                                            </td>
                                                                            <td style={{ 
                                                                                padding: "6px 10px", 
                                                                                borderBottom: "1px solid #eee" 
                                                                            }}>
                                                                                <span style={{ color: "#888", fontSize: "12px" }}>
                                                                                    {weekdayLabel}依序：
                                                                                </span>
                                                                                {itemNames.join("、")}
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{
                                                border: "1px solid #ccc",
                                                padding: "8px",
                                                background: "white",
                                                textAlign: "center",
                                                fontWeight: "bold",
                                                verticalAlign: "top",
                                                color: vendor.color || "#333"
                                            }}>
                                                {vendor.name}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Order Table Section */}
                <div style={{
                    background: "linear-gradient(180deg, #4a90d9 0%, #357abd 100%)",
                    padding: "10px 20px",
                    borderRadius: "4px 4px 0 0"
                }}>
                    <h2 style={{ color: "white", fontSize: "14px", fontWeight: "bold", margin: 0 }}>
                        訂餐選單
                    </h2>
                </div>

                <div style={{
                    background: "white",
                    border: "1px solid #ddd",
                    borderTop: "none",
                    padding: "20px"
                }}>
                    <div style={{ marginBottom: "10px", fontWeight: "bold" }}>
                        使用者：{user?.name}
                    </div>

                    {hasNewSelections && (
                        <div style={{ marginBottom: "15px" }}>
                            <button
                                onClick={submitOrders}
                                disabled={submitting}
                                style={{
                                    padding: "8px 24px",
                                    background: submitting ? "#aaa" : "linear-gradient(180deg, #5cb85c 0%, #4cae4c 100%)",
                                    color: "white",
                                    border: "1px solid #4cae4c",
                                    borderRadius: "3px",
                                    cursor: submitting ? "not-allowed" : "pointer",
                                    fontWeight: "bold"
                                }}
                            >
                                {submitting ? "送出中..." : "確認送出"}
                            </button>
                        </div>
                    )}

                    {/* Orders Table */}
                    <div style={{ overflowX: "auto" }}>
                        <table style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            fontSize: "13px",
                            minWidth: "800px"
                        }}>
                            <thead>
                                <tr style={{ background: "#ffffff" ,textAlign : "-webkit-center"}}>
                                    <th style={{ border: "1px solid #ccc", padding: "8px", width: "100px" }}>日期</th>
                                    <th style={{ border: "1px solid #ccc", padding: "8px", width: "60px" }}>星期</th>
                                    {mealOptions.map((meal, index) => (
                                        <th key={index} style={{ 
                                            border: "1px solid #ccc", 
                                            padding: "8px", 
                                            fontSize: "12px",
                                            lineHeight: "1.3"
                                        }}>
                                            <div style={{ fontWeight: "bold", color: meal.vendor_color || "#333" ,width: 'max-content'}}>
                                                {meal.vendor_name}
                                            </div>
                                            <div style={{ fontWeight: "normal", color: "#666", fontSize: "11px" ,width: 'max-content'}}>
                                                {meal.item_description? meal.item_description : meal.item_name}
                                            </div>
                                        </th>
                                    ))}
                                    <th style={{ border: "1px solid #ccc", padding: "8px", width: "80px" }}>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dayOrders.map((day) => {
                                    const hasExisting = !!day.existingOrder;
                                    const existingMealIndex = hasExisting
                                        ? mealOptions.findIndex(m =>
                                            m.vendor_id === day.existingOrder?.vendor_id &&
                                            m.item_name === day.existingOrder?.menu_item_name
                                        )
                                        : -1;

                                    return (
                                        <tr key={day.date} style={{
                                            background: day.isPast ? "#f5f5f5" : "white"
                                        }}>
                                            <td style={{ border: "1px solid #ccc", padding: "8px", textAlign: "center" }}>
                                                {day.date.replace(/-/g, '/')}
                                            </td>
                                            <td style={{ border: "1px solid #ccc", padding: "8px", textAlign: "center" }}>
                                                {day.dayOfWeek}
                                            </td>
                                            {mealOptions.map((_, mealIndex) => {
                                                const isSelected = day.selectedMealIndex === mealIndex;
                                                const isExistingMeal = existingMealIndex === mealIndex;
                                                const isDisabled = day.isPast;

                                                return (
                                                    <td key={mealIndex} style={{
                                                        border: "1px solid #ccc",
                                                        padding: "8px",
                                                        textAlign: "center"
                                                    }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected || isExistingMeal}
                                                            disabled={isDisabled || hasExisting}
                                                            onChange={() => toggleDayMeal(day.date, mealIndex)}
                                                            style={{ cursor: isDisabled || hasExisting ? "not-allowed" : "pointer" }}
                                                        />
                                                    </td>
                                                );
                                            })}
                                            <td style={{ border: "1px solid #ccc", padding: "8px", textAlign: "center" }}>
                                                {hasExisting && !day.isPast && (
                                                    <button
                                                        onClick={() => cancelExistingOrder(day.existingOrder!.id)}
                                                        style={{
                                                            padding: "4px 12px",
                                                            background: "#d9534f",
                                                            color: "white",
                                                            border: "none",
                                                            borderRadius: "3px",
                                                            cursor: "pointer",
                                                            fontSize: "12px"
                                                        }}
                                                    >
                                                        取消
                                                    </button>
                                                )}
                                                {day.isPast && (
                                                    <span style={{ color: "#999", fontSize: "12px" }}>已過期</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {hasNewSelections && (
                        <div style={{ marginTop: "20px" }}>
                            <button
                                onClick={submitOrders}
                                disabled={submitting}
                                style={{
                                    padding: "8px 24px",
                                    background: submitting ? "#aaa" : "linear-gradient(180deg, #5cb85c 0%, #4cae4c 100%)",
                                    color: "white",
                                    border: "1px solid #4cae4c",
                                    borderRadius: "3px",
                                    cursor: submitting ? "not-allowed" : "pointer",
                                    fontWeight: "bold"
                                }}
                            >
                                {submitting ? "送出中..." : "確認送出"}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

