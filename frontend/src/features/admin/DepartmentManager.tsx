import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../../components/Toast";
import { Loading, LoadingButton } from "../../components/Loading";

interface Department {
    id: number;
    name: string;
    is_active: boolean;
}

export const DepartmentManager: React.FC = () => {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const { token } = useAuth();
    const { showToast } = useToast();

    const [newDeptName, setNewDeptName] = useState("");

    useEffect(() => {
        loadDepartments();
    }, []);

    const loadDepartments = async () => {
        try {
            setLoading(true);
            const data = await api.get("/admin/departments", token!);
            setDepartments(data);
        } catch (error) {
            showToast("載入部門列表失敗", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newDeptName.trim()) {
            showToast("請輸入部門名稱", "error");
            return;
        }

        try {
            setSubmitting(true);
            await api.post("/admin/departments", { name: newDeptName }, token!);
            showToast("部門已新增", "success");
            setNewDeptName("");
            loadDepartments();
        } catch (error: any) {
            showToast(error.message || "操作失敗", "error");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: number, name: string) => {
        if (!confirm(`確定要刪除「${name}」嗎？`)) {
            return;
        }

        try {
            await api.delete(`/admin/departments/${id}`, token!);
            showToast("部門已刪除", "success");
            loadDepartments();
        } catch (error: any) {
            showToast(error.message || "刪除失敗", "error");
        }
    };

    if (loading) return <Loading />;

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-6">部門管理</h2>

            <form onSubmit={handleSubmit} className="mb-8 bg-gray-50 p-6 rounded-lg border">
                <h3 className="font-bold mb-4 text-lg">新增部門</h3>
                <div className="flex gap-4">
                    <div className="flex-1">
                        <input
                            placeholder="部門名稱"
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={newDeptName}
                            onChange={(e) => setNewDeptName(e.target.value)}
                        />
                    </div>
                    <LoadingButton
                        type="submit"
                        loading={submitting}
                        className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 transition"
                    >
                        新增
                    </LoadingButton>
                </div>
            </form>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-100 border-b">
                            <th className="text-left p-3 font-semibold">部門名稱</th>
                            <th className="text-center p-3 font-semibold">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {departments.length === 0 ? (
                            <tr>
                                <td colSpan={2} className="p-4 text-center text-gray-500">
                                    尚無部門資料
                                </td>
                            </tr>
                        ) : (
                            departments.map((dept) => (
                                <tr key={dept.id} className="border-b hover:bg-gray-50">
                                    <td className="p-3 font-medium">{dept.name}</td>
                                    <td className="p-3 text-center">
                                        <button
                                            onClick={() => handleDelete(dept.id, dept.name)}
                                            className="text-red-600 hover:text-red-800"
                                        >
                                            刪除
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
