import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../../components/Toast";
import { Loading } from "../../components/Loading";

export const StatsView: React.FC = () => {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const { token } = useAuth();
    const { showToast } = useToast();

    useEffect(() => {
        loadStats();
    }, [selectedDate]);

    const loadStats = async () => {
        try {
            setLoading(true);
            const data = await api.get(`/admin/stats?date=${selectedDate}`, token!);
            setStats(data);
        } catch (error) {
            showToast("載入統計資料失敗", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedDate(e.target.value);
    };

    if (loading && !stats) return <Loading />;

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold">訂單統計</h2>
                <div className="flex items-center gap-4">
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={handleDateChange}
                        className="border rounded px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        onClick={loadStats}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                    >
                        重新整理
                    </button>
                </div>
            </div>

            {stats && (
                <>
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

                    <div className="space-y-8">
                        {stats.vendors.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">此日期尚無訂單</p>
                        ) : (
                            stats.vendors.map((vendor: any) => (
                                <div key={vendor.name} className="border rounded-lg overflow-hidden">
                                    <div className="bg-gray-50 p-4 border-b flex justify-between items-center">
                                        <h3 className="text-lg font-bold text-gray-800">{vendor.name}</h3>
                                        <div className="text-sm text-gray-600">
                                            <span className="mr-4">數量: {vendor.total_orders}</span>
                                            <span className="font-bold text-green-700">總額: ${vendor.total_price}</span>
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-white border-b text-sm text-gray-500">
                                                    <th className="text-left p-3 font-medium">品項</th>
                                                    <th className="text-right p-3 font-medium">數量</th>
                                                    <th className="text-right p-3 font-medium">小計</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {vendor.items.map((item: any) => (
                                                    <tr key={item.name} className="border-b last:border-0 hover:bg-gray-50">
                                                        <td className="p-3 text-gray-800">{item.description? item.description + " (" + item.name + ")" : item.name}</td>
                                                        <td className="p-3 text-right font-medium">{item.count}</td>
                                                        <td className="p-3 text-right text-gray-600">${item.subtotal}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}
        </div>
    );
};
