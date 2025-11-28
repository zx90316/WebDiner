import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../../components/Toast";
import { Loading } from "../../components/Loading";

export const StatsView: React.FC = () => {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const { token } = useAuth();
    const { showToast } = useToast();

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            setLoading(true);
            const data = await api.get("/admin/stats/today", token!);
            setStats(data);
        } catch (error) {
            showToast("載入統計資料失敗", "error");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <Loading />;
    if (!stats) return <div className="text-center text-gray-500">無法載入統計資料</div>;

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">今日統計 ({stats.date})</h2>
                <button
                    onClick={loadStats}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                >
                    重新整理
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
                    <h3 className="text-gray-600 text-sm font-medium mb-2">總訂單數</h3>
                    <p className="text-4xl font-bold text-blue-700">{stats.total_orders}</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
                    <h3 className="text-gray-600 text-sm font-medium mb-2">總金額</h3>
                    <p className="text-4xl font-bold text-green-700">${stats.total_price}</p>
                </div>
            </div>

            <h3 className="text-xl font-bold mb-4">餐點統計</h3>
            {Object.keys(stats.item_counts).length === 0 ? (
                <p className="text-gray-500 text-center py-8">今日尚無訂單</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-100 border-b">
                                <th className="text-left p-3 font-semibold">餐點名稱</th>
                                <th className="text-right p-3 font-semibold">數量</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(stats.item_counts)
                                .sort((a: any, b: any) => b[1] - a[1])
                                .map(([name, count]: [string, any]) => (
                                    <tr key={name} className="border-b hover:bg-gray-50">
                                        <td className="p-3">{name}</td>
                                        <td className="p-3 text-right font-medium">{count}</td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
