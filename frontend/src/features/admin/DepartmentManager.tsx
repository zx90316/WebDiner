import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../../components/Toast";
import { Loading, LoadingButton } from "../../components/Loading";

interface Division {
    id: number;
    name: string;
    is_active: boolean;
    display_order: number;
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
    const [newDivision, setNewDivision] = useState({ name: "", display_order: 0 });
    const [editDivision, setEditDivision] = useState({ name: "", display_order: 0 });

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
        if (!newDivision.name.trim()) {
            showToast("請輸入處別名稱", "error");
            return;
        }
        try {
            setSubmitting(true);
            await api.post("/admin/divisions", newDivision, token!);
            showToast("處別已新增", "success");
            setNewDivision({ name: "", display_order: 0 });
            loadData();
        } catch (error: any) {
            showToast(error.message || "操作失敗", "error");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDivisionEdit = (division: Division) => {
        setDivisionEditingId(division.id);
        setEditDivision({ name: division.name, display_order: division.display_order || 0 });
    };

    const handleDivisionUpdate = async () => {
        if (!editDivision.name.trim()) {
            showToast("處別名稱不可為空", "error");
            return;
        }
        try {
            setSubmitting(true);
            await api.put(`/admin/divisions/${divisionEditingId}`, editDivision, token!);
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

    const getDivision = (divisionId: number | null) => {
        if (!divisionId) return null;
        return divisions.find((d) => d.id === divisionId) || null;
    };

    if (loading) return <Loading />;

    // 按欄位分組，再按處別分組
    const getColumnData = () => {
        const columns: Array<{ divisionId: number | null; divisionName: string; divisionOrder: number; departments: Department[] }[]> = [[], [], [], []];
        
        // 先按欄位分組
        const deptsByColumn: Department[][] = [[], [], [], []];
        departments.forEach(dept => {
            const col = dept.display_column || 0;
            if (col >= 0 && col < 4) {
                deptsByColumn[col].push(dept);
            }
        });

        // 每欄內按處別分組
        for (let col = 0; col < 4; col++) {
            const colDepts = deptsByColumn[col];
            const divisionGroups = new Map<number | null, Department[]>();
            
            colDepts.forEach(dept => {
                const divId = dept.division_id;
                if (!divisionGroups.has(divId)) {
                    divisionGroups.set(divId, []);
                }
                divisionGroups.get(divId)!.push(dept);
            });

            // 轉換為陣列並排序
            divisionGroups.forEach((depts, divId) => {
                depts.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
                const div = getDivision(divId);
                columns[col].push({
                    divisionId: divId,
                    divisionName: div?.name || "未分類",
                    divisionOrder: div?.display_order ?? 999,
                    departments: depts,
                });
            });

            // 處別排序：按 display_order 排序，未分類的放最後
            columns[col].sort((a, b) => {
                if (a.divisionId === null) return 1;
                if (b.divisionId === null) return -1;
                return a.divisionOrder - b.divisionOrder;
            });
        }

        return columns;
    };

    const columnData = getColumnData();

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
                        <form onSubmit={handleDivisionSubmit} className="flex gap-3 items-end bg-gray-50 p-4 rounded-lg">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">處別名稱</label>
                                <input
                                    type="text"
                                    placeholder="例如：管理處、技術處"
                                    className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500"
                                    value={newDivision.name}
                                    onChange={(e) => setNewDivision({ ...newDivision, name: e.target.value })}
                                />
                            </div>
                            <div className="w-20">
                                <label className="block text-sm font-medium text-gray-700 mb-1">排序</label>
                                <input
                                    type="number"
                                    min="0"
                                    className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500"
                                    value={newDivision.display_order}
                                    onChange={(e) => setNewDivision({ ...newDivision, display_order: parseInt(e.target.value) || 0 })}
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

                        <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
                            💡 排序數字越小，在同一欄內顯示越靠前（例如：車輛安全審驗中心=0, 管理處=1）
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {[...divisions].sort((a, b) => (a.display_order || 0) - (b.display_order || 0)).map((division) => {
                                const deptCount = departments.filter(d => d.division_id === division.id).length;
                                return (
                                    <div key={division.id} className="bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-100 flex items-center gap-2">
                                        {divisionEditingId === division.id ? (
                                            <>
                                                <input
                                                    type="text"
                                                    className="w-28 p-1 border rounded text-sm"
                                                    value={editDivision.name}
                                                    onChange={(e) => setEditDivision({ ...editDivision, name: e.target.value })}
                                                    autoFocus
                                                />
                                                <input
                                                    type="number"
                                                    min="0"
                                                    className="w-12 p-1 border rounded text-sm"
                                                    value={editDivision.display_order}
                                                    onChange={(e) => setEditDivision({ ...editDivision, display_order: parseInt(e.target.value) || 0 })}
                                                />
                                                <button onClick={handleDivisionUpdate} disabled={submitting} className="text-indigo-600 hover:text-indigo-800 text-sm">✓</button>
                                                <button onClick={() => setDivisionEditingId(null)} className="text-gray-500 hover:text-gray-700 text-sm">✕</button>
                                            </>
                                        ) : (
                                            <>
                                                <span className="text-xs bg-indigo-200 text-indigo-700 px-1.5 py-0.5 rounded font-mono">#{division.display_order || 0}</span>
                                                <span className="font-medium text-indigo-800">{division.name}</span>
                                                <span className="text-xs text-gray-500">({deptCount})</span>
                                                <button onClick={() => handleDivisionEdit(division)} className="text-indigo-600 hover:text-indigo-800 text-xs ml-1">編輯</button>
                                                <button onClick={() => handleDivisionDelete(division.id, division.name)} className="text-red-500 hover:text-red-700 text-xs">刪除</button>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                            {divisions.length === 0 && <div className="text-gray-500 py-2">尚無處別資料，請先新增處別</div>}
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

            {/* 部門列表 - 分機表預覽佈局 */}
            <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">📞 分機表佈局預覽</h2>
                    <p className="text-sm text-gray-500">共 {departments.length} 個部門</p>
                </div>
                
                {/* 4欄佈局 */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    {columnData.map((column, colIndex) => (
                        <div key={colIndex} className="space-y-3">
                            {/* 欄位標題 */}
                            <div className="bg-gray-100 rounded-lg px-3 py-2 text-center">
                                <span className="font-bold text-gray-600">第 {colIndex + 1} 欄</span>
                                <span className="text-xs text-gray-400 ml-2">
                                    ({column.reduce((sum, g) => sum + g.departments.length, 0)} 個部門)
                                </span>
                            </div>

                            {/* 處別分組 */}
                            {column.map((group, groupIdx) => (
                                <div key={groupIdx} className="bg-white rounded-lg border shadow-sm overflow-hidden">
                                    {/* 處別標題 */}
                                    <div className={`px-3 py-2 text-white font-medium ${
                                        group.divisionId === null 
                                            ? 'bg-orange-500' 
                                            : 'bg-gradient-to-r from-blue-600 to-blue-700'
                                    }`}>
                                        {group.divisionName}
                                    </div>

                                    {/* 部門列表 */}
                                    <div className="divide-y">
                                        {group.departments.map((dept) => (
                                            <div key={dept.id} className="group">
                                                {editingId === dept.id ? (
                                                    // 編輯模式
                                                    <div className="p-3 bg-blue-50 space-y-2">
                                                        <input
                                                            type="text"
                                                            className="w-full p-1.5 border rounded text-sm"
                                                            value={editForm.name}
                                                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                                            autoFocus
                                                        />
                                                        <div className="flex gap-2">
                                                            <select
                                                                className="flex-1 p-1 border rounded text-xs"
                                                                value={editForm.division_id || ""}
                                                                onChange={(e) => setEditForm({ ...editForm, division_id: e.target.value ? parseInt(e.target.value) : null })}
                                                            >
                                                                <option value="">未分類</option>
                                                                {divisions.map((div) => (
                                                                    <option key={div.id} value={div.id}>{div.name}</option>
                                                                ))}
                                                            </select>
                                                            <select
                                                                className="w-20 p-1 border rounded text-xs"
                                                                value={editForm.display_column}
                                                                onChange={(e) => setEditForm({ ...editForm, display_column: parseInt(e.target.value) })}
                                                            >
                                                                <option value={0}>欄1</option>
                                                                <option value={1}>欄2</option>
                                                                <option value={2}>欄3</option>
                                                                <option value={3}>欄4</option>
                                                            </select>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                className="w-14 p-1 border rounded text-xs"
                                                                value={editForm.display_order}
                                                                onChange={(e) => setEditForm({ ...editForm, display_order: parseInt(e.target.value) || 0 })}
                                                                placeholder="#"
                                                            />
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={handleUpdate}
                                                                disabled={submitting}
                                                                className="flex-1 bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
                                                            >
                                                                儲存
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingId(null)}
                                                                className="flex-1 bg-gray-300 text-gray-700 px-2 py-1 rounded text-xs hover:bg-gray-400"
                                                            >
                                                                取消
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    // 顯示模式
                                                    <div className="px-3 py-2 hover:bg-gray-50 flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-gray-400 font-mono">#{dept.display_order}</span>
                                                            <span className="font-medium text-gray-700">{dept.name}</span>
                                                        </div>
                                                        <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition">
                                                            <button
                                                                onClick={() => handleEdit(dept)}
                                                                className="text-blue-500 hover:text-blue-700 text-xs px-1"
                                                            >
                                                                編輯
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(dept.id, dept.name)}
                                                                className="text-red-500 hover:text-red-700 text-xs px-1"
                                                            >
                                                                刪除
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {/* 空欄位提示 */}
                            {column.length === 0 && (
                                <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center text-gray-400">
                                    <div className="text-2xl mb-2">📭</div>
                                    <div className="text-sm">此欄尚無部門</div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {departments.length === 0 && (
                    <div className="text-center text-gray-500 py-12">
                        <div className="text-4xl mb-4">🏢</div>
                        <div>尚無部門資料，請先新增部門</div>
                    </div>
                )}
            </div>
        </div>
    );
};
