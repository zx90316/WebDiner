import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../../components/Toast";
import { Loading, LoadingButton } from "../../components/Loading";

interface User {
    id: number;
    employee_id: string;
    name: string;
    department_id: number;
    extension: string;
    email: string;
    is_admin: boolean;
    role: string;
    is_active: boolean;
}

interface Department {
    id: number;
    name: string;
}

export const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const { token, user: currentUser } = useAuth();
    const { showToast } = useToast();

    const [formData, setFormData] = useState({
        employee_id: "",
        name: "",
        department_id: "" as number | "",
        extension: "",
        email: "",
        password: "",
        role: "user",
    });

    const [editingId, setEditingId] = useState<number | null>(null);

    // Check if current user is System Admin
    // Note: We need to ensure the currentUser object has the role property updated from backend
    // For now we can infer from is_admin, but ideally we check role directly if available
    const isSysAdmin = (currentUser as any)?.role === "sysadmin";

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [usersData, deptsData] = await Promise.all([
                api.get("/admin/users", token!),
                api.get("/admin/departments", token!)
            ]);
            setUsers(usersData);
            setDepartments(deptsData);
        } catch (error) {
            showToast("載入資料失敗", "error");
        } finally {
            setLoading(false);
        }
    };

    const loadUsers = async () => {
        try {
            const data = await api.get("/admin/users", token!);
            setUsers(data);
        } catch (error) {
            showToast("載入人員列表失敗", "error");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.employee_id || !formData.name || !formData.email) {
            showToast("請填寫必填欄位", "error");
            return;
        }

        try {
            setSubmitting(true);
            const payload: any = {
                employee_id: formData.employee_id,
                name: formData.name,
                department_id: formData.department_id ? Number(formData.department_id) : null,
                extension: formData.extension,
                email: formData.email,
                role: formData.role,
            };

            if (formData.password) {
                payload.password = formData.password;
            }

            if (editingId) {
                await api.put(`/admin/users/${editingId}`, payload, token!);
                showToast("人員已更新", "success");
            } else {
                if (!formData.password) {
                    showToast("新增人員時必須設定密碼", "error");
                    setSubmitting(false);
                    return;
                }
                await api.post("/admin/users", payload, token!);
                showToast("人員已新增", "success");
            }

            setFormData({
                employee_id: "",
                name: "",
                department_id: "",
                extension: "",
                email: "",
                password: "",
                role: "user",
            });
            setEditingId(null);
            loadUsers();
        } catch (error: any) {
            showToast(error.message || "操作失敗", "error");
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (user: User) => {
        // Prevent editing admins if not sysadmin
        if (!isSysAdmin && (user.role === "admin" || user.role === "sysadmin")) {
            showToast("您沒有權限編輯此管理員帳號", "error");
            return;
        }

        setFormData({
            employee_id: user.employee_id,
            name: user.name,
            department_id: user.department_id || "",
            extension: user.extension || "",
            email: user.email,
            password: "", // Don't fill password
            role: user.role || "user",
        });
        setEditingId(user.id);
    };

    const handleDelete = async (id: number, name: string, role: string) => {
        if (!isSysAdmin && (role === "admin" || role === "sysadmin")) {
            showToast("您沒有權限刪除此管理員帳號", "error");
            return;
        }

        if (!confirm(`確定要刪除「${name}」嗎？`)) {
            return;
        }

        try {
            await api.delete(`/admin/users/${id}`, token!);
            showToast("人員已刪除", "success");
            loadUsers();
        } catch (error: any) {
            showToast(error.message || "刪除失敗", "error");
        }
    };

    const cancelEdit = () => {
        setFormData({
            employee_id: "",
            name: "",
            department_id: "",
            extension: "",
            email: "",
            password: "",
            role: "user",
        });
        setEditingId(null);
    };

    if (loading) return <Loading />;

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-6">用戶管理</h2>

            <form onSubmit={handleSubmit} className="mb-8 bg-gray-50 p-6 rounded-lg border">
                <h3 className="font-bold mb-4 text-lg">
                    {editingId ? "編輯人員" : "新增人員"}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-gray-700 mb-2 font-medium">
                            工號 <span className="text-red-500">*</span>
                        </label>
                        <input
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={formData.employee_id}
                            onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 mb-2 font-medium">
                            姓名 <span className="text-red-500">*</span>
                        </label>
                        <input
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 mb-2 font-medium">部門</label>
                        <select
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={formData.department_id}
                            onChange={(e) => setFormData({ ...formData, department_id: e.target.value ? Number(e.target.value) : "" })}
                        >
                            <option value="">請選擇部門</option>
                            {departments.map(dept => (
                                <option key={dept.id} value={dept.id}>{dept.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-gray-700 mb-2 font-medium">分機</label>
                        <input
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={formData.extension}
                            onChange={(e) => setFormData({ ...formData, extension: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 mb-2 font-medium">
                            Email <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="email"
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 mb-2 font-medium">
                            密碼 {editingId && <span className="text-gray-500 text-sm">(若不修改請留空)</span>}
                        </label>
                        <input
                            type="password"
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required={!editingId}
                        />
                    </div>

                    {/* Role Selection - Only visible/editable for System Admins */}
                    {isSysAdmin && (
                        <div>
                            <label className="block text-gray-700 mb-2 font-medium">
                                角色權限
                            </label>
                            <select
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            >
                                <option value="user">一般用戶</option>
                                <option value="admin">管理員</option>
                                <option value="sysadmin">系統管理員</option>
                            </select>
                        </div>
                    )}
                </div>
                <div className="flex gap-2 mt-4">
                    <LoadingButton
                        type="submit"
                        loading={submitting}
                        className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 transition"
                    >
                        {editingId ? "更新人員" : "新增人員"}
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
                            <th className="text-left p-3 font-semibold">工號</th>
                            <th className="text-left p-3 font-semibold">姓名</th>
                            <th className="text-left p-3 font-semibold">部門</th>
                            <th className="text-left p-3 font-semibold">分機</th>
                            <th className="text-left p-3 font-semibold">Email</th>
                            <th className="text-center p-3 font-semibold">權限</th>
                            <th className="text-center p-3 font-semibold">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <tr key={user.id} className="border-b hover:bg-gray-50">
                                <td className="p-3 font-medium">{user.employee_id}</td>
                                <td className="p-3">{user.name}</td>
                                <td className="p-3">{departments.find(d => d.id === user.department_id)?.name || "-"}</td>
                                <td className="p-3">{user.extension || "-"}</td>
                                <td className="p-3">{user.email}</td>
                                <td className="p-3 text-center">
                                    {user.role === "sysadmin" ? (
                                        <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                                            系統管理員
                                        </span>
                                    ) : user.role === "admin" ? (
                                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                            管理員
                                        </span>
                                    ) : (
                                        <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">
                                            一般
                                        </span>
                                    )}
                                </td>
                                <td className="p-3 text-center">
                                    {/* Edit/Delete only allowed if SysAdmin OR (Admin and target is User) */}
                                    {(isSysAdmin || (user.role !== "admin" && user.role !== "sysadmin")) && (
                                        <>
                                            <button
                                                onClick={() => handleEdit(user)}
                                                className="text-blue-600 hover:text-blue-800 mr-3"
                                            >
                                                編輯
                                            </button>
                                            <button
                                                onClick={() => handleDelete(user.id, user.name, user.role)}
                                                className="text-red-600 hover:text-red-800"
                                            >
                                                刪除
                                            </button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
