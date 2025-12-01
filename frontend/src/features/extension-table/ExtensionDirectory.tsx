import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useToast } from "../../components/Toast";
import { Loading } from "../../components/Loading";

interface ExtensionUser {
    employee_id: string;
    name: string;
    extension: string | null;
    title: string | null;
    is_department_head: boolean;
}

interface ExtensionDepartment {
    id: number;
    name: string;
    division_id: number | null;
    division_name: string | null;
    display_order: number;
    users: ExtensionUser[];
}

interface ExtensionDivision {
    id: number;
    name: string;
    display_column: number;
    display_order: number;
    departments: ExtensionDepartment[];
}

interface ExtensionColumn {
    column_index: number;
    divisions: ExtensionDivision[];
}

interface ExtensionDirectoryData {
    columns: ExtensionColumn[];
    generated_at: string;
}

export const ExtensionDirectory: React.FC = () => {
    const [data, setData] = useState<ExtensionDirectoryData | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const { showToast } = useToast();

    useEffect(() => {
        loadDirectory();
    }, []);

    const loadDirectory = async () => {
        try {
            setLoading(true);
            const result = await api.get("/extension-directory/");
            setData(result);
        } catch (error: any) {
            showToast(error.message || "載入分機表失敗", "error");
        } finally {
            setLoading(false);
        }
    };

    // 搜尋過濾
    const filterData = (data: ExtensionDirectoryData): ExtensionDirectoryData => {
        if (!searchTerm.trim()) return data;

        const term = searchTerm.toLowerCase();

        return {
            ...data,
            columns: data.columns.map((col) => ({
                ...col,
                divisions: col.divisions
                    .map((div) => ({
                        ...div,
                        departments: div.departments
                            .map((dept) => ({
                                ...dept,
                                users: dept.users.filter(
                                    (u) =>
                                        u.name.toLowerCase().includes(term) ||
                                        u.extension?.includes(term) ||
                                        u.employee_id.toLowerCase().includes(term) ||
                                        u.title?.toLowerCase().includes(term)
                                ),
                            }))
                            .filter((dept) => dept.users.length > 0 || dept.name.toLowerCase().includes(term)),
                    }))
                    .filter((div) => div.departments.length > 0 || div.name.toLowerCase().includes(term)),
            })),
        };
    };

    if (loading) return <Loading fullScreen />;

    if (!data) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-gray-500">無法載入分機表資料</div>
            </div>
        );
    }

    const filteredData = filterData(data);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            {/* 頂部標題列 */}
            <div className="bg-white shadow-sm border-b sticky top-0 z-10">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">
                                📞 財團法人車輛安全審驗中心分機表
                            </h1>
                            <p className="text-sm text-gray-500 mt-1">
                                更新時間：{new Date(data.generated_at).toLocaleString("zh-TW")}
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            {/* 搜尋框 */}
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="搜尋姓名、分機、工號..."
                                    className="pl-10 pr-4 py-2 border rounded-lg w-64 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                    🔍
                                </span>
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm("")}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                            {/* 重新整理按鈕 */}
                            <button
                                onClick={loadDirectory}
                                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                title="重新整理"
                            >
                                🔄
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 分機表主體 - 4欄佈局 */}
            <div className="container mx-auto px-4 py-6">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    {filteredData.columns.map((column) => (
                        <div key={column.column_index} className="space-y-4">
                            {column.divisions.map((division) => (
                                <DivisionCard
                                    key={division.id}
                                    division={division}
                                    searchTerm={searchTerm}
                                />
                            ))}
                        </div>
                    ))}
                </div>

                {/* 無結果提示 */}
                {searchTerm && filteredData.columns.every((col) => col.divisions.length === 0) && (
                    <div className="text-center py-12 text-gray-500">
                        <div className="text-4xl mb-4">🔍</div>
                        <div>找不到符合「{searchTerm}」的結果</div>
                    </div>
                )}
            </div>
        </div>
    );
};

// 處別卡片組件
const DivisionCard: React.FC<{
    division: ExtensionDivision;
    searchTerm: string;
}> = ({ division, searchTerm }) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            {/* 處別標題 */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-1">
                <h2 className="font-bold text-lg">{division.name}</h2>
            </div>

            {/* 部門列表 */}
            <div className="divide-y">
                {division.departments.map((dept) => (
                    <DepartmentSection
                        key={dept.id}
                        department={dept}
                        searchTerm={searchTerm}
                    />
                ))}
            </div>
        </div>
    );
};

// 部門區塊組件
const DepartmentSection: React.FC<{
    department: ExtensionDepartment;
    searchTerm: string;
}> = ({ department, searchTerm }) => {
    const [expanded, setExpanded] = useState(true);

    return (
        <div>
            {/* 部門標題 */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full px-4 py-2 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition"
            >
                <span className="font-medium text-gray-700">{department.name}</span>
                <span className="text-gray-400 text-sm">
                    {expanded ? "▼" : "▶"} {department.users.length}人
                </span>
            </button>

            {/* 人員列表 */}
            {expanded && (
                <div className="divide-y divide-gray-100">
                    {department.users.map((user, idx) => (
                        <UserRow key={idx} user={user} searchTerm={searchTerm} />
                    ))}
                </div>
            )}
        </div>
    );
};

// 人員列組件
const UserRow: React.FC<{
    user: ExtensionUser;
    searchTerm: string;
}> = ({ user, searchTerm }) => {
    const highlightText = (text: string | null) => {
        if (!text || !searchTerm.trim()) return text;
        const regex = new RegExp(`(${searchTerm})`, "gi");
        const parts = text.split(regex);
        return parts.map((part, i) =>
            regex.test(part) ? (
                <mark key={i} className="bg-yellow-200 px-0.5 rounded">
                    {part}
                </mark>
            ) : (
                part
            )
        );
    };

    return (
        <div className="px-4 py-2 hover:bg-blue-50 flex items-center justify-between transition group text-right">
            <div className="flex items-center gap-3">
                {/* 姓名 */}
                <div>
                    <span className="font-medium text-gray-800">
                        {/* 主管標記 */}
                        {user.title && user.is_department_head && (
                            <span className="text-gray-500 text-sm mr-1">
                                {highlightText(user.title)}
                            </span>
                        )}
                        {highlightText(user.name)}
                    </span>
                </div>
            </div>
            {/* 分機 */}
            <div className="text-right">
                {user.extension ? (
                    <span className="font-mono text-blue-600 font-semibold bg-blue-50 px-2 py-1 rounded group-hover:bg-blue-100 transition">
                        {highlightText(user.extension)}
                    </span>
                ) : (
                    <span className="text-gray-400 text-sm">--</span>
                )}
            </div>
        </div>
    );
};

export default ExtensionDirectory;

