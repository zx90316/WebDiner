import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../../components/Toast";
import { Loading } from "../../components/Loading";

// Helper for date formatting
const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

interface OrderDetail {
    user_id: number;
    employee_id: string;
    name: string;
    department: string;
    order_id: number | null;
    item_name: string;
    vendor_name: string;
    vendor_color: string;
    vendor_id: number | null;
    item_id: number | null;
}

interface VendorMenuItem {
    id: number;
    name: string;
    description: string;
    price: number;
}

interface Vendor {
    id: number;
    name: string;
    description: string;
    color: string;
}

interface AvailableVendor {
    vendor: Vendor;
    menu_items: VendorMenuItem[];
}

export const UserOrderingSettings: React.FC = () => {
    const [date, setDate] = useState(getTodayString());
    const [orders, setOrders] = useState<OrderDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const { token } = useAuth();
    const { showToast } = useToast();

    // Edit Modal State
    const [editingUser, setEditingUser] = useState<OrderDetail | null>(null);
    const [availableVendors, setAvailableVendors] = useState<AvailableVendor[]>([]);
    const [loadingVendors, setLoadingVendors] = useState(false);

    useEffect(() => {
        loadOrders();
    }, [date]);

    const loadOrders = async () => {
        try {
            setLoading(true);
            const data = await api.get(`/admin/orders/daily_details?date=${date}`, token!);
            setOrders(data);
        } catch (error) {
            showToast("載入訂單資料失敗", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = async (order: OrderDetail) => {
        setEditingUser(order);
        try {
            setLoadingVendors(true);
            const data = await api.get(`/vendors/available/${date}`, token!);
            setAvailableVendors(data);
        } catch (error) {
            showToast("載入廠商資料失敗", "error");
        } finally {
            setLoadingVendors(false);
        }
    };

    const handleCloseModal = () => {
        setEditingUser(null);
        setAvailableVendors([]);
    };

    const handleSelectNoOrder = async () => {
        if (!editingUser) return;
        try {
            await api.put("/admin/orders/user_order", {
                user_id: editingUser.user_id,
                order_date: date,
                is_cancel: true
            }, token!);
            showToast("已取消訂單", "success");
            handleCloseModal();
            loadOrders();
        } catch (error: any) {
            showToast(error.message || "操作失敗", "error");
        }
    };

    const handleSelectItem = async (vendorId: number, itemId: number) => {
        if (!editingUser) return;
        try {
            await api.put("/admin/orders/user_order", {
                user_id: editingUser.user_id,
                order_date: date,
                vendor_id: vendorId,
                item_id: itemId,
                is_cancel: false
            }, token!);
            showToast("訂單已更新", "success");
            handleCloseModal();
            loadOrders();
        } catch (error: any) {
            showToast(error.message || "操作失敗", "error");
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">人員訂餐設定</h2>
                <div className="flex items-center gap-2">
                    <label className="font-medium text-gray-700">選擇日期：</label>
                    <input
                        type="date"
                        className="p-2 border rounded focus:ring-2 focus:ring-blue-500"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <Loading />
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-100 border-b">
                                <th className="text-left p-3 font-semibold">工號</th>
                                <th className="text-left p-3 font-semibold">姓名</th>
                                <th className="text-left p-3 font-semibold">部門</th>
                                <th className="text-left p-3 font-semibold">餐點</th>
                                <th className="text-center p-3 font-semibold">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((order) => (
                                <tr key={order.user_id} className="border-b hover:bg-gray-50">
                                    <td className="p-3 font-medium">{order.employee_id}</td>
                                    <td className="p-3">{order.name}</td>
                                    <td className="p-3">{order.department || "-"}</td>
                                    <td className="p-3">
                                        {order.item_name !== "未選" ? (
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-3 h-3 rounded-full"
                                                    style={{ backgroundColor: order.vendor_color || '#ccc' }}
                                                />
                                                <span>{order.item_name}</span>
                                                <span className="text-xs text-gray-500">({order.vendor_name})</span>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400">未選</span>
                                        )}
                                    </td>
                                    <td className="p-3 text-center">
                                        <button
                                            onClick={() => handleEditClick(order)}
                                            className="text-blue-600 hover:text-blue-800 font-medium"
                                        >
                                            編輯
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Edit Modal */}
            {editingUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
                            <h3 className="text-xl font-bold">
                                編輯訂單 - {editingUser.name} ({editingUser.employee_id})
                            </h3>
                            <button
                                onClick={handleCloseModal}
                                className="text-gray-500 hover:text-gray-700 text-2xl"
                            >
                                &times;
                            </button>
                        </div>

                        <div className="p-6">
                            {loadingVendors ? (
                                <Loading />
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {/* No Order Button */}
                                    <button
                                        onClick={handleSelectNoOrder}
                                        className="w-full text-left p-3 bg-gray-50 border border-gray-200 text-gray-600 rounded hover:bg-gray-100 transition-all shadow-sm flex flex-col justify-center min-h-[80px]"
                                    >
                                        <div className="font-bold text-center w-full">取消/未選</div>
                                    </button>

                                    {/* Vendor Items */}
                                    {availableVendors.flatMap(v => v.menu_items.map(item => ({ vendor: v.vendor, item }))).map(({ vendor, item }) => (
                                        <button
                                            key={`${vendor.id}-${item.id}`}
                                            onClick={() => handleSelectItem(vendor.id, item.id)}
                                            className="w-full text-left p-3 bg-white border text-gray-800 rounded hover:opacity-80 transition-all shadow-sm group flex flex-col justify-between min-h-[80px]"
                                            style={{ borderColor: vendor.color || '#BFDBFE', borderLeftWidth: '4px' }}
                                        >
                                            <div className="font-bold text-sm line-clamp-2 mb-1">
                                                {item.name}
                                            </div>
                                            <div className="text-xs text-gray-500 truncate">
                                                {vendor.name}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {availableVendors.length === 0 && !loadingVendors && (
                                <div className="text-center text-gray-500 py-8">
                                    今日無可選廠商
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
