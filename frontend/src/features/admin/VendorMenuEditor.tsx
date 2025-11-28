import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../../components/Toast";
import { Loading, LoadingButton } from "../../components/Loading";

interface Vendor {
    id: number;
    name: string;
}

interface VendorMenuItem {
    id: number;
    vendor_id: number;
    name: string;
    description: string;
    price: number;
    weekday: number | null;
    is_active: boolean;
}

const WEEKDAYS = ["週一", "週二", "週三", "週四", "週五"];

export const VendorMenuEditor: React.FC = () => {
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [selectedVendor, setSelectedVendor] = useState<number | null>(null);
    const [menuItems, setMenuItems] = useState<VendorMenuItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const { token } = useAuth();
    const { showToast } = useToast();

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        price: "",
        weekday: "",  // "" for all days, "0"-"4" for specific day
    });

    const [editingId, setEditingId] = useState<number | null>(null);

    useEffect(() => {
        loadVendors();
    }, []);

    useEffect(() => {
        if (selectedVendor) {
            loadMenuItems();
        }
    }, [selectedVendor]);

    const loadVendors = async () => {
        try {
            const data = await api.get("/vendors/", token!);
            setVendors(data);
            if (data.length > 0) {
                setSelectedVendor(data[0].id);
            }
        } catch (error) {
            showToast("載入廠商列表失敗", "error");
        }
    };

    const loadMenuItems = async () => {
        if (!selectedVendor) return;
        try {
            setLoading(true);
            const data = await api.get(`/vendors/${selectedVendor}/menu`, token!);
            setMenuItems(data);
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

        if (!selectedVendor) {
            showToast("請先選擇廠商", "error");
            return;
        }

        try {
            setSubmitting(true);
            const payload = {
                name: formData.name,
                description: formData.description,
                price: parseInt(formData.price),
                weekday: formData.weekday === "" ? null : parseInt(formData.weekday),
                is_active: true,
            };

            if (editingId) {
                await api.put(`/vendors/${selectedVendor}/menu/${editingId}`, payload, token!);
                showToast("品項已更新", "success");
            } else {
                await api.post(`/vendors/${selectedVendor}/menu`, payload, token!);
                showToast("品項已新增", "success");
            }

            setFormData({ name: "", description: "", price: "", weekday: "" });
            setEditingId(null);
            loadMenuItems();
        } catch (error: any) {
            showToast(error.message || "操作失敗", "error");
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (item: VendorMenuItem) => {
        setFormData({
            name: item.name,
            description: item.description,
            price: item.price.toString(),
            weekday: item.weekday === null ? "" : item.weekday.toString(),
        });
        setEditingId(item.id);
    };

    const handleDelete = async (id: number, name: string) => {
        if (!confirm(`確定要刪除「${name}」嗎？`)) {
            return;
        }

        try {
            await api.delete(`/vendors/${selectedVendor}/menu/${id}`, token!);
            showToast("品項已刪除", "success");
            loadMenuItems();
        } catch (error: any) {
            showToast(error.message || "刪除失敗", "error");
        }
    };

    const cancelEdit = () => {
        setFormData({ name: "", description: "", price: "", weekday: "" });
        setEditingId(null);
    };

    const groupedItems = WEEKDAYS.map((day, index) => ({
        day,
        items: menuItems.filter((item) => item.weekday === index),
    }));

    const allDayItems = menuItems.filter((item) => item.weekday === null);

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-6">廠商菜單設定</h2>

            {/* Vendor Selector */}
            <div className="mb-6">
                <label className="block text-gray-700 mb-2 font-medium">選擇廠商</label>
                <select
                    className="w-full md:w-1/2 p-2 border rounded focus:ring-2 focus:ring-blue-500"
                    value={selectedVendor || ""}
                    onChange={(e) => setSelectedVendor(parseInt(e.target.value))}
                >
                    {vendors.map((vendor) => (
                        <option key={vendor.id} value={vendor.id}>
                            {vendor.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Add/Edit Form */}
            <form onSubmit={handleSubmit} className="mb-8 bg-gray-50 p-6 rounded-lg border">
                <h3 className="font-bold mb-4 text-lg">
                    {editingId ? "編輯品項" : "新增品項"}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-gray-700 mb-2 font-medium">
                            品項名稱 <span className="text-red-500">*</span>
                        </label>
                        <input
                            placeholder="例：漢堡、葷食便當"
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
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
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 mb-2 font-medium">供應日期</label>
                        <select
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                            value={formData.weekday}
                            onChange={(e) => setFormData({ ...formData, weekday: e.target.value })}
                        >
                            <option value="">每天供應</option>
                            {WEEKDAYS.map((day, index) => (
                                <option key={index} value={index}>
                                    僅{day}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-gray-700 mb-2 font-medium">描述</label>
                        <input
                            placeholder="品項描述（選填）"
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>
                </div>
                <div className="flex gap-2 mt-4">
                    <LoadingButton
                        type="submit"
                        loading={submitting}
                        className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600"
                    >
                        {editingId ? "更新品項" : "新增品項"}
                    </LoadingButton>
                    {editingId && (
                        <button
                            type="button"
                            onClick={cancelEdit}
                            className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
                        >
                            取消編輯
                        </button>
                    )}
                </div>
            </form>

            {/* Menu Items Display */}
            {loading ? (
                <Loading />
            ) : (
                <div className="space-y-6">
                    {/* All Day Items */}
                    {allDayItems.length > 0 && (
                        <div>
                            <h3 className="font-bold text-lg mb-3">📅 每天供應</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {allDayItems.map((item) => (
                                    <div key={item.id} className="border p-4 rounded bg-blue-50">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <h4 className="font-bold">{item.name}</h4>
                                                {item.description && (
                                                    <p className="text-sm text-gray-600">{item.description}</p>
                                                )}
                                                <p className="text-green-600 font-medium mt-1">${item.price}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleEdit(item)}
                                                    className="text-blue-600 hover:text-blue-800 text-sm"
                                                >
                                                    編輯
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item.id, item.name)}
                                                    className="text-red-600 hover:text-red-800 text-sm"
                                                >
                                                    刪除
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Weekday Items */}
                    {groupedItems.map(({ day, items }, dayIndex) => (
                        items.length > 0 && (
                            <div key={dayIndex}>
                                <h3 className="font-bold text-lg mb-3">{day}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {items.map((item) => (
                                        <div key={item.id} className="border p-4 rounded bg-gray-50">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <h4 className="font-bold">{item.name}</h4>
                                                    {item.description && (
                                                        <p className="text-sm text-gray-600">{item.description}</p>
                                                    )}
                                                    <p className="text-green-600 font-medium mt-1">${item.price}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleEdit(item)}
                                                        className="text-blue-600 hover:text-blue-800 text-sm"
                                                    >
                                                        編輯
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item.id, item.name)}
                                                        className="text-red-600 hover:text-red-800 text-sm"
                                                    >
                                                        刪除
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    ))}

                    {menuItems.length === 0 && (
                        <div className="text-center text-gray-500 py-8">
                            <p>此廠商尚未設定菜單</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
