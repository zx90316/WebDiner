import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../../components/Toast";
import { Loading } from "../../components/Loading";

interface Order {
    id: number;
    user_id: number;
    vendor_id: number;
    vendor_menu_item_id: number;
    order_date: string;
    created_at: string;
    status: string;
    vendor_name: string;
    menu_item_name: string;
    menu_item_price: number;
}

export const MyOrders: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const { token } = useAuth();
    const { showToast } = useToast();

    useEffect(() => {
        loadOrders();
    }, []);

    const loadOrders = async () => {
        try {
            setLoading(true);
            const data = await api.get("/orders/", token!);
            setOrders(data);
        } catch (error) {
            showToast("載入訂單失敗", "error");
        } finally {
            setLoading(false);
        }
    };

    const cancelOrder = async (orderId: number, orderDate: string) => {
        const now = new Date();
        const orderDateTime = new Date(orderDate);
        const cutoffTime = new Date(orderDateTime);
        cutoffTime.setHours(9, 0, 0, 0);

        // Check if it's the same day and before 9:00 AM
        const isSameDay = now.toDateString() === orderDateTime.toDateString();
        const isBeforeCutoff = now < cutoffTime;

        if (!isSameDay || !isBeforeCutoff) {
            showToast("只能在訂單當天 9:00 前取消訂單", "error");
            return;
        }

        if (!confirm("確定要取消這個訂單嗎？")) {
            return;
        }

        try {
            await api.delete(`/orders/${orderId}`, token!);
            showToast("訂單已取消", "success");
            loadOrders();
        } catch (error: any) {
            showToast(error.message || "取消訂單失敗", "error");
        }
    };

    const canCancel = (orderDate: string) => {
        const now = new Date();
        const orderDateTime = new Date(orderDate + "T00:00:00");
        const cutoffTime = new Date(orderDateTime);
        cutoffTime.setHours(9, 0, 0, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const orderDay = new Date(orderDateTime);
        orderDay.setHours(0, 0, 0, 0);

        const isSameDay = today.getTime() === orderDay.getTime();
        const isBeforeCutoff = now < cutoffTime;

        return isSameDay && isBeforeCutoff;
    };

    if (loading) {
        return <Loading fullScreen />;
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="container mx-auto px-4">
                <h1 className="text-3xl font-bold mb-6">我的訂單</h1>

                {orders.length === 0 ? (
                    <div className="text-center text-gray-500 py-12 bg-white rounded-lg shadow">
                        <p className="text-lg">尚無訂單</p>
                        <p className="text-sm mt-2">前往訂餐頁面開始訂餐</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {orders.map((order) => (
                            <div key={order.id} className="bg-white p-6 rounded-lg shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold">訂單 #{order.id}</h3>
                                        <p className="text-gray-600">訂餐日期: {order.order_date}</p>
                                        <p className="text-sm text-gray-500">
                                            建立時間: {new Date(order.created_at).toLocaleString("zh-TW")}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span
                                            className={`px-3 py-1 rounded ${order.status === "Pending"
                                                ? "bg-yellow-100 text-yellow-800"
                                                : order.status === "Completed"
                                                    ? "bg-green-100 text-green-800"
                                                    : "bg-gray-100 text-gray-800"
                                                }`}
                                        >
                                            {order.status === "Pending" ? "待處理" : order.status === "Confirmed" ? "已完成" : "已取消"}
                                        </span>
                                        {canCancel(order.order_date) && order.status === "Pending" && (
                                            <button
                                                onClick={() => cancelOrder(order.id, order.order_date)}
                                                className="text-red-600 hover:text-red-800 text-sm font-medium"
                                            >
                                                取消訂單
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="border-t pt-4">
                                    <h4 className="font-semibold mb-3 text-gray-700">訂單內容</h4>
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-bold text-lg">{order.vendor_name}</p>
                                                <p className="text-gray-700">{order.menu_item_name}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
