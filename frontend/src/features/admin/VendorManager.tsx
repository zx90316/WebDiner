import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../../components/Toast";
import { Loading, LoadingButton } from "../../components/Loading";

interface Vendor {
    id: number;
    name: string;
    description: string;
    color: string;
    is_active: boolean;
}

export const VendorManager: React.FC = () => {
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const { token } = useAuth();
    const { showToast } = useToast();

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        color: "#3B82F6",
    });

    const [editingId, setEditingId] = useState<number | null>(null);

    useEffect(() => {
        loadVendors();
    }, []);

    const loadVendors = async () => {
        try {
            setLoading(true);
            const data = await api.get("/vendors/", token!);
            setVendors(data);
        } catch (error) {
            showToast("載入廠商列表失敗", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name) {
            showToast("請輸入廠商名稱", "error");
            return;
        }

        try {
            setSubmitting(true);
            const payload = {
                name: formData.name,
                description: formData.description,
                color: formData.color,
                is_active: true,
            };

            if (editingId) {
                await api.put(`/vendors/${editingId}`, payload, token!);
                showToast("廠商已更新", "success");
            } else {
                await api.post("/vendors/", payload, token!);
                showToast("廠商已新增", "success");
            }

            setFormData({ name: "", description: "", color: "#3B82F6" });
            setEditingId(null);
            loadVendors();
        } catch (error: any) {
            showToast(error.message || "操作失敗", "error");
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (vendor: Vendor) => {
        setFormData({
            name: vendor.name,
            description: vendor.description,
            color: vendor.color || "#3B82F6",
        });
        setEditingId(vendor.id);
    };

    const handleDelete = async (id: number, name: string) => {
        if (!confirm(`確定要刪除「${name}」嗎？`)) {
            return;
        }

        try {
            await api.delete(`/vendors/${id}`, token!);
            showToast("廠商已刪除", "success");
            loadVendors();
        } catch (error: any) {
            showToast(error.message || "刪除失敗", "error");
        }
    };

    const cancelEdit = () => {
        setFormData({ name: "", description: "", color: "#3B82F6" });
        setEditingId(null);
    };

    if (loading) return <Loading />;

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-6">廠商管理</h2>

            <form onSubmit={handleSubmit} className="mb-8 bg-gray-50 p-6 rounded-lg border">
                <h3 className="font-bold mb-4 text-lg">
                    {editingId ? "編輯廠商" : "新增廠商"}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-gray-700 mb-2 font-medium">
                            廠商名稱 <span className="text-red-500">*</span>
                        </label>
                        <input
                            placeholder="例：麥當勞、便當店A"
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 mb-2 font-medium">描述</label>
                        <input
                            placeholder="廠商描述（選填）"
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 mb-2 font-medium">代表色</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                className="h-10 w-20 p-1 border rounded cursor-pointer"
                                value={formData.color}
                                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                            />
                            <span className="text-gray-500 text-sm">{formData.color}</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2 mt-4">
                    <LoadingButton
                        type="submit"
                        loading={submitting}
                        className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 transition"
                    >
                        {editingId ? "更新廠商" : "新增廠商"}
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
                            <th className="text-left p-3 font-semibold">廠商名稱</th>
                            <th className="text-left p-3 font-semibold">代表色</th>
                            <th className="text-left p-3 font-semibold">描述</th>
                            <th className="text-center p-3 font-semibold">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {vendors.map((vendor) => (
                            <tr key={vendor.id} className="border-b hover:bg-gray-50">
                                <td className="p-3 font-medium">{vendor.name}</td>
                                <td className="p-3">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-6 h-6 rounded border shadow-sm"
                                            style={{ backgroundColor: vendor.color || "#3B82F6" }}
                                        />
                                        <span className="text-xs text-gray-500">{vendor.color}</span>
                                    </div>
                                </td>
                                <td className="p-3 text-gray-600">{vendor.description || "-"}</td>
                                <td className="p-3 text-center">
                                    <button
                                        onClick={() => handleEdit(vendor)}
                                        className="text-blue-600 hover:text-blue-800 mr-3"
                                    >
                                        編輯
                                    </button>
                                    <button
                                        onClick={() => handleDelete(vendor.id, vendor.name)}
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
