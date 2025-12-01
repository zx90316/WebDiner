import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../../components/Toast";
import { Loading, LoadingButton } from "../../components/Loading";

interface Division {
    id: number;
    name: string;
    is_active: boolean;
}

interface Department {
    id: number;
    name: string;
    is_active: boolean;
    division_id: number | null;
    display_column: number;
    display_order: number;
}

export const DepartmentManager: React.FC = () => {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [divisions, setDivisions] = useState<Division[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [divisionEditingId, setDivisionEditingId] = useState<number | null>(null);
    const [showDivisionSection, setShowDivisionSection] = useState(false);
    const { token } = useAuth();
    const { showToast } = useToast();

    // 新增部門表單
    const [newDept, setNewDept] = useState({
        name: "",
        division_id: null as number | null,
        display_column: 0,
        display_order: 0,
    });

    // 編輯部門表單
    const [editForm, setEditForm] = useState({
        name: "",
        division_id: null as number | null,
        display_column: 0,
        display_order: 0,
    });

    // 新增/編輯處別表單
    const [newDivisionName, setNewDivisionName] = useState("");
    const [editDivisionName, setEditDivisionName] = useState("");

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [deptData, divData] = await Promise.all([
                api.get("/admin/departments", token!),
                api.get("/admin/divisions", token!),
            ]);
            setDepartments(deptData);
            setDivisions(divData);
        } catch (error) {
            showToast("載入資料失敗", "error");
        } finally {
            setLoading(false);
        }
    };

    // 部門 CRUD
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDept.name.trim()) {
            showToast("請輸入部門名稱", "error");
            return;
        }
        try {
            setSubmitting(true);
            await api.post("/admin/departments", newDept, token!);
            showToast("部門已新增", "success");
            setNewDept({ name: "", division_id: null, display_column: 0, display_order: 0 });
            loadData();
        } catch (error: any) {
            showToast(error.message || "操作失敗", "error");
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (dept: Department) => {
        setEditingId(dept.id);
        setEditForm({
            name: dept.name,
            division_id: dept.division_id,
            display_column: dept.display_column || 0,
            display_order: dept.display_order || 0,
        });
    };

    const handleUpdate = async () => {
        if (!editForm.name.trim()) {
            showToast("部門名稱不可為空", "error");
            return;
        }
        try {
            setSubmitting(true);
            await api.put(`/admin/departments/${editingId}`, editForm, token!);
            showToast("部門已更新", "success");
            setEditingId(null);
            loadData();
        } catch (error: any) {
            showToast(error.message || "更新失敗", "error");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: number, name: string) => {
        if (!confirm(`確定要刪除「${name}」嗎？`)) return;
        try {
            await api.delete(`/admin/departments/${id}`, token!);
            showToast("部門已刪除", "success");
            loadData();
        } catch (error: any) {
            showToast(error.message || "刪除失敗", "error");
        }
    };

    // 處別 CRUD
    const handleDivisionSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDivisionName.trim()) {
            showToast("請輸入處別名稱", "error");
            return;
        }
        try {
            setSubmitting(true);
            await api.post("/admin/divisions", { name: newDivisionName }, token!);
            showToast("處別已新增", "success");
            setNewDivisionName("");
            loadData();
        } catch (error: any) {
            showToast(error.message || "操作失敗", "error");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDivisionEdit = (division: Division) => {
        setDivisionEditingId(division.id);
        setEditDivisionName(division.name);
    };

    const handleDivisionUpdate = async () => {
        if (!editDivisionName.trim()) {
            showToast("處別名稱不可為空", "error");
            return;
        }
        try {
            setSubmitting(true);
            await api.put(`/admin/divisions/${divisionEditingId}`, { name: editDivisionName }, token!);
            showToast("處別已更新", "success");
            setDivisionEditingId(null);
            loadData();
        } catch (error: any) {
            showToast(error.message || "更新失敗", "error");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDivisionDelete = async (id: number, name: string) => {
        const deptCount = departments.filter(d => d.division_id === id).length;
        if (deptCount > 0) {
            showToast(`無法刪除「${name}」：仍有 ${deptCount} 個部門屬於此處別`, "error");
            return;
        }
        if (!confirm(`確定要刪除「${name}」嗎？`)) return;
        try {
            await api.delete(`/admin/divisions/${id}`, token!);
            showToast("處別已刪除", "success");
            loadData();
        } catch (error: any) {
            showToast(error.message || "刪除失敗", "error");
        }
    };

    const getDivisionName = (divisionId: number | null) => {
        if (!divisionId) return "未指定";
        const div = divisions.find((d) => d.id === divisionId);
        return div ? div.name : "未知";
    };

    if (loading) return <Loading />;

    // 按處別分組
    const groupedByDivision = departments.reduce((acc, dept) => {
        const divId = dept.division_id || 0;
        if (!acc[divId]) acc[divId] = [];
        acc[divId].push(dept);
        return acc;
    }, {} as Record<number, Department[]>);

    return (
        <div className="space-y-6">
            {/* 處別管理區塊 (可收合) */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <button
                    onClick={() => setShowDivisionSection(!showDivisionSection)}
                    className="w-full px-6 py-4 bg-gradient-to-r from-indigo-50 to-purple-50 flex items-center justify-between hover:from-indigo-100 hover:to-purple-100 transition"
                >
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🏛️</span>
                        <div className="text-left">
                            <h2 className="text-lg font-bold text-gray-800">處別管理</h2>
                            <p className="text-sm text-gray-500">目前 {divisions.length} 個處別</p>
                        </div>
                    </div>
                    <span className={`text-2xl transition-transform ${showDivisionSection ? 'rotate-180' : ''}`}>▼</span>
                </button>

                {showDivisionSection && (
                    <div className="p-6 border-t space-y-4">
                        {/* 新增處別表單 */}
                        <form onSubmit={handleDivisionSubmit} className="flex gap-3 items-end bg-gray-50 p-4 rounded-lg">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">處別名稱</label>
                                <input
                                    type="text"
                                    placeholder="例如：管理處、技術處"
                                    className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500"
                                    value={newDivisionName}
                                    onChange={(e) => setNewDivisionName(e.target.value)}
                                />
                            </div>
                            <LoadingButton
                                type="submit"
                                loading={submitting}
                                className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600 transition h-[42px]"
                            >
                                新增處別
                            </LoadingButton>
                        </form>

                        {/* 處別列表 */}
                        <div className="flex flex-wrap gap-2">
                            {divisions.map((division) => {
                                const deptCount = departments.filter(d => d.division_id === division.id).length;
                                return (
                                    <div key={division.id} className="bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-100 flex items-center gap-2">
                                        {divisionEditingId === division.id ? (
                                            <>
                                                <input
                                                    type="text"
                                                    className="w-32 p-1 border rounded text-sm"
                                                    value={editDivisionName}
                                                    onChange={(e) => setEditDivisionName(e.target.value)}
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={handleDivisionUpdate}
                                                    disabled={submitting}
                                                    className="text-indigo-600 hover:text-indigo-800 text-sm"
                                                >
                                                    ✓
                                                </button>
                                                <button
                                                    onClick={() => setDivisionEditingId(null)}
                                                    className="text-gray-500 hover:text-gray-700 text-sm"
                                                >
                                                    ✕
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <span className="font-medium text-indigo-800">{division.name}</span>
                                                <span className="text-xs text-gray-500">({deptCount})</span>
                                                <button
                                                    onClick={() => handleDivisionEdit(division)}
                                                    className="text-indigo-600 hover:text-indigo-800 text-xs ml-1"
                                                >
                                                    編輯
                                                </button>
                                                <button
                                                    onClick={() => handleDivisionDelete(division.id, division.name)}
                                                    className="text-red-500 hover:text-red-700 text-xs"
                                                >
                                                    刪除
                                                </button>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                            {divisions.length === 0 && (
                                <div className="text-gray-500 py-2">尚無處別資料，請先新增處別</div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* 新增部門表單 */}
            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold mb-4">新增部門</h2>
                <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm font-medium text-gray-700 mb-1">部門名稱</label>
                        <input
                            type="text"
                            placeholder="例如：行政服務部、研究企畫一部"
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                            value={newDept.name}
                            onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
                        />
                    </div>
                    <div className="w-48">
                        <label className="block text-sm font-medium text-gray-700 mb-1">所屬處別</label>
                        <select
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                            value={newDept.division_id || ""}
                            onChange={(e) => setNewDept({ ...newDept, division_id: e.target.value ? parseInt(e.target.value) : null })}
                        >
                            <option value="">-- 請選擇 --</option>
                            {divisions.map((div) => (
                                <option key={div.id} value={div.id}>{div.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="w-32">
                        <label className="block text-sm font-medium text-gray-700 mb-1">顯示欄位</label>
                        <select
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                            value={newDept.display_column}
                            onChange={(e) => setNewDept({ ...newDept, display_column: parseInt(e.target.value) })}
                        >
                            <option value={0}>第一欄</option>
                            <option value={1}>第二欄</option>
                            <option value={2}>第三欄</option>
                            <option value={3}>第四欄</option>
                        </select>
                    </div>
                    <div className="w-24">
                        <label className="block text-sm font-medium text-gray-700 mb-1">排序</label>
                        <input
                            type="number"
                            min="0"
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                            value={newDept.display_order}
                            onChange={(e) => setNewDept({ ...newDept, display_order: parseInt(e.target.value) || 0 })}
                        />
                    </div>
                    <LoadingButton
                        type="submit"
                        loading={submitting}
                        className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 transition h-[42px]"
                    >
                        新增
                    </LoadingButton>
                </form>
            </div>

            {/* 部門列表 - 按處別分組 */}
            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold mb-4">部門列表</h2>
                
                {/* 未分配處別的部門 */}
                {groupedByDivision[0] && groupedByDivision[0].length > 0 && (
                    <div className="mb-6">
                        <h3 className="font-semibold text-orange-600 mb-3 pb-2 border-b border-orange-200 flex items-center gap-2">
                            <span className="bg-orange-100 px-2 py-1 rounded">⚠️ 未指定處別</span>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {groupedByDivision[0].map((dept) => renderDeptCard(dept))}
                        </div>
                    </div>
                )}

                {/* 按處別分組顯示 */}
                {divisions.map((division) => {
                    const depts = groupedByDivision[division.id] || [];
                    return (
                        <div key={division.id} className="mb-6">
                            <h3 className="font-semibold text-gray-700 mb-3 pb-2 border-b flex items-center gap-2">
                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">{division.name}</span>
                                <span className="text-sm text-gray-500">({depts.length} 個部門)</span>
                            </h3>
                            {depts.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {depts.sort((a, b) => (a.display_order || 0) - (b.display_order || 0)).map((dept) => renderDeptCard(dept))}
                                </div>
                            ) : (
                                <div className="text-gray-400 text-sm py-4">尚無部門</div>
                            )}
                        </div>
                    );
                })}

                {departments.length === 0 && <div className="text-center text-gray-500 py-8">尚無部門資料</div>}
            </div>
        </div>
    );

    function renderDeptCard(dept: Department) {
        return (
            <div key={dept.id} className="bg-gray-50 p-4 rounded-lg border">
                {editingId === dept.id ? (
                    <div className="space-y-3">
                        <input
                            type="text"
                            className="w-full p-2 border rounded"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        />
                        <select
                            className="w-full p-2 border rounded"
                            value={editForm.division_id || ""}
                            onChange={(e) => setEditForm({ ...editForm, division_id: e.target.value ? parseInt(e.target.value) : null })}
                        >
                            <option value="">-- 未指定 --</option>
                            {divisions.map((div) => (
                                <option key={div.id} value={div.id}>{div.name}</option>
                            ))}
                        </select>
                        <div className="flex gap-2 items-center">
                            <span className="text-sm text-gray-600">欄位:</span>
                            <select
                                className="flex-1 p-1 border rounded"
                                value={editForm.display_column}
                                onChange={(e) => setEditForm({ ...editForm, display_column: parseInt(e.target.value) })}
                            >
                                <option value={0}>第一欄</option>
                                <option value={1}>第二欄</option>
                                <option value={2}>第三欄</option>
                                <option value={3}>第四欄</option>
                            </select>
                        </div>
                        <div className="flex gap-2 items-center">
                            <span className="text-sm text-gray-600">排序:</span>
                            <input
                                type="number"
                                min="0"
                                className="w-20 p-1 border rounded"
                                value={editForm.display_order}
                                onChange={(e) => setEditForm({ ...editForm, display_order: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleUpdate}
                                disabled={submitting}
                                className="flex-1 bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600"
                            >
                                儲存
                            </button>
                            <button
                                onClick={() => setEditingId(null)}
                                className="flex-1 bg-gray-300 text-gray-700 px-3 py-2 rounded hover:bg-gray-400"
                            >
                                取消
                            </button>
                        </div>
                    </div>
                ) : (
                    <div>
                        <div className="flex justify-between items-start mb-2">
                            <div className="font-medium text-lg">{dept.name}</div>
                            <div className="flex gap-1">
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">欄{(dept.display_column || 0) + 1}</span>
                                <span className="text-xs bg-gray-200 px-2 py-1 rounded">#{dept.display_order || 0}</span>
                            </div>
                        </div>
                        <div className="text-sm text-gray-500 mb-3">處別: {getDivisionName(dept.division_id)}</div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleEdit(dept)}
                                className="flex-1 text-blue-600 hover:text-blue-800 text-sm border border-blue-300 rounded px-3 py-1 hover:bg-blue-50"
                            >
                                編輯
                            </button>
                            <button
                                onClick={() => handleDelete(dept.id, dept.name)}
                                className="flex-1 text-red-600 hover:text-red-800 text-sm border border-red-300 rounded px-3 py-1 hover:bg-red-50"
                            >
                                刪除
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }
};

