import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../../components/Toast";
import { Loading, LoadingButton } from "../../components/Loading";

interface MenuItem {
    id: number;
    name: string;
    description: string;
    price: number;
    category: string;
}

interface CartItem extends MenuItem {
    quantity: number;
}

export const MenuPage: React.FC = () => {
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [orderDate, setOrderDate] = useState<string>(new Date().toISOString().split("T")[0]);
    const { token, user } = useAuth();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadMenu();
    }, []);

    const loadMenu = async () => {
        try {
            setLoading(true);
            const items = await api.get("/menu/", token!);
            setMenuItems(items);
        } catch (err) {
            showToast("載入菜單失敗", "error");
        } finally {
            setLoading(false);
        }
    };

    const addToCart = (item: MenuItem) => {
        setCart((prev) => {
            const existing = prev.find((i) => i.id === item.id);
            if (existing) {
                return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
            }
            return [...prev, { ...item, quantity: 1 }];
        });
        showToast(`已添加 ${item.name}`, "success");
    };

    const removeFromCart = (itemId: number) => {
        const item = cart.find((i) => i.id === itemId);
        setCart((prev) => prev.filter((i) => i.id !== itemId));
        if (item) {
            showToast(`已移除 ${item.name}`, "info");
        }
    };

    const updateQuantity = (itemId: number, delta: number) => {
        setCart((prev) =>
            prev
                .map((i) => {
                    if (i.id === itemId) {
                        const newQuantity = i.quantity + delta;
                        return newQuantity > 0 ? { ...i, quantity: newQuantity } : null;
                    }
                    return i;
                })
                .filter((i) => i !== null) as CartItem[]
        );
    };

    const submitOrder = async () => {
        if (cart.length === 0) return;

        try {
            setSubmitting(true);
            const items = cart.map((i) => ({
                menu_item_id: i.id,
                quantity: i.quantity,
            }));

            await api.post(
                "/orders/",
                {
                    order_date: orderDate,
                    items: items,
                },
                token!
            );
            showToast("訂單送出成功！", "success");
            setCart([]);
        } catch (err: any) {
            showToast(err.message || "訂單送出失敗", "error");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <Loading fullScreen />;
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="container mx-auto px-4">
                <h1 className="text-3xl font-bold mb-6">點餐</h1>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Menu Items */}
                    <div className="lg:col-span-2">
                        {menuItems.length === 0 ? (
                            <div className="text-center text-gray-500 py-12"><p>目前沒有可用的餐點</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {menuItems.map((item) => (
                                    <div
                                        key={item.id}
                                        className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition"
                                    >
                                        <h3 className="font-bold text-lg">{item.name}</h3>
                                        <p className="text-gray-600 text-sm">{item.description}</p>
                                        <div className="mt-3 flex justify-between items-center">
                                            {user?.is_admin && <span className="text-green-600 font-bold">${item.price}</span>}
                                            <button
                                                onClick={() => addToCart(item)}
                                                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
                                            >
                                                加入
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Cart */}
                    <div className="lg:col-span-1">
                        <div className="bg-white p-6 rounded-lg shadow sticky top-4">
                            <h2 className="text-xl font-bold mb-4">您的訂單</h2>

                            <div className="mb-4">
                                <label className="block text-gray-700 mb-2 font-medium">訂餐日期</label>
                                <input
                                    type="date"
                                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    value={orderDate}
                                    onChange={(e) => setOrderDate(e.target.value)}
                                    min={new Date().toISOString().split("T")[0]}
                                />
                            </div>

                            {cart.length === 0 ? (
                                <p className="text-gray-500 text-center py-8">購物車是空的</p>
                            ) : (
                                <>
                                    <ul className="mb-4 space-y-2">
                                        {cart.map((item) => (
                                            <li key={item.id} className="flex justify-between items-center border-b pb-2">
                                                <div className="flex-1">
                                                    <p className="font-medium">{item.name}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <button
                                                            onClick={() => updateQuantity(item.id, -1)}
                                                            className="text-gray-500 hover:text-gray-700 w-6 h-6 flex items-center justify-center border rounded"
                                                        >
                                                            -
                                                        </button>
                                                        <span className="text-sm">{item.quantity}</span>
                                                        <button
                                                            onClick={() => updateQuantity(item.id, 1)}
                                                            className="text-gray-500 hover:text-gray-700 w-6 h-6 flex items-center justify-center border rounded"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => removeFromCart(item.id)}
                                                    className="text-red-500 hover:text-red-700 ml-2"
                                                >
                                                    ×
                                                </button>
                                            </li>
                                        ))}
                                    </ul>

                                    <LoadingButton
                                        loading={submitting}
                                        onClick={submitOrder}
                                        className="w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 transition font-medium"
                                    >
                                        送出訂單
                                    </LoadingButton>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
