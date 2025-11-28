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
    is_active: boolean;
}

export const MenuManager: React.FC = () => {
    const [items, setItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const { token } = useAuth();
    const { showToast } = useToast();

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        price: "",
        category: "主食",
    });

    const [editingId, setEditingId] = useState<number | null>(null);

    useEffect(() => {
        loadItems();
    }, []);

    const loadItems = async () => {
        try {
            setLoading(true);
            const data = await api.get("/menu/", token!);
            setItems(data);
        } catch (error) {
            showToast("載入菜單失敗", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.price) {
            showToast("請填寫所有必填欄位", "error");
            return;
        }

        try {
            setSubmitting(true);
            const payload = {
                name: formData.name,
                description: formData.description,
                price: parseInt(formData.price),
                category: formData.category,
                is_active: true,
            };

            if (editingId) {
                await api.put(`/menu/${editingId}`, payload, token!);
                showToast("餐點已更新", "success");
            } else {
                await api.post("/menu/", payload, token!);
                showToast("餐點已新增", "success");
            }

            setFormData({ name: "", description: "", price: "", category: "主食" });
            setEditingId(null);
            loadItems();
        } catch (error: any) {
            showToast(error.message || "操作失敗", "error");
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (item: MenuItem) => {
        setFormData({
            name: item.name,
            description: item.description,
            price: item.price.toString(),
            category: item.category,
        });
        setEditingId(item.id);
    };

    const handleDelete = async (id: number, name: string) => {
        if (!confirm(`確定要刪除「${name}」嗎？`)) {
            return;
        }

        try {
            await api.delete(`/menu/${id}`, token!);
            showToast("餐點已刪除", "success");
            loadItems();
        } catch (error: any) {
            showToast(error.message || "刪除失敗", "error");
        }
    };

    const cancelEdit = () => {
        setFormData({ name: "", description: "", price: "", category: "主食" });
        setEditingId(null);
    };

    if (loading) return <Loading />;

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-6">菜單管理</h2>

            <form onSubmit={handleSubmit} className="mb-8 bg-gray-50 p-6 rounded-lg border">
                <h3 className="font-bold mb-4 text-lg">
                    {editingId ? "編輯餐點" : "新增餐點"}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-gray-700 mb-2 font-medium">
                            餐點名稱 <span className="text-red-500">*</span>
                        </label>
                        <input
                            placeholder="例：牛肉漢堡"
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 mb-2 font-medium">
                            價格 (元) <span className="text-red-500">*</span>
                        </label>
                        <input
                            placeholder="100"
                            type="number"
                            min="0"
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 mb-2 font-medium">分類</label>
                        <select
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        >
                            <option>主食</option>
                            <option>配菜</option>
                            <option>飲料</option>
                            <option>甜點</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-gray-700 mb-2 font-medium">描述</label>
                        <input
                            placeholder="餐點描述"
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>
                </div>
                <div className="flex gap-2 mt-4">
                    <LoadingButton
                        type="submit"
                        loading={submitting}
                        className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 transition"
                    >
                        {editingId ? "更新餐點" : "新增餐點"}
                    </LoadingButton>
                    {editingId && (
                        <button
                            type="button"
                            onClick={cancelEdit}
                            className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600 transition"
                        >
                            取消編輯
                        </button>
                    )}
                </div>
            </form>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-100 border-b">
                            <th className="text-left p-3 font-semibold">名稱</th>
                            <th className="text-left p-3 font-semibold">分類</th>
                            <th className="text-right p-3 font-semibold">價格</th>
                            <th className="text-center p-3 font-semibold">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item) => (
                            <tr key={item.id} className="border-b hover:bg-gray-50">
                                <td className="p-3">
                                    <div>
                                        <p className="font-medium">{item.name}</p>
                                        {item.description && (
                                            <p className="text-sm text-gray-500">{item.description}</p>
                                        )}
                                    </div>
                                </td>
                                <td className="p-3">{item.category}</td>
                                <td className="p-3 text-right font-medium">${item.price}</td>
                                <td className="p-3 text-center">
                                    <button
                                        onClick={() => handleEdit(item)}
                                        className="text-blue-600 hover:text-blue-800 mr-3"
                                    >
                                        編輯
                                    </button>
                                    <button
                                        onClick={() => handleDelete(item.id, item.name)}
                                        className="text-red-600 hover:text-red-800"
                                    >
                                        刪除
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
