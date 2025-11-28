import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../../components/Toast";
import { Loading, LoadingButton } from "../../components/Loading";

export const RemindersView: React.FC = () => {
    const [missingUsers, setMissingUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const { token } = useAuth();
    const { showToast } = useToast();
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

    useEffect(() => {
        loadMissing();
    }, [date]);

    const loadMissing = async () => {
        try {
            setLoading(true);
            const data = await api.get(`/admin/reminders/missing?target_date=${date}`, token!);
            setMissingUsers(data);
        } catch (error) {
            showToast("載入未訂餐用戶失敗", "error");
        } finally {
            setLoading(false);
        }
    };

    const sendReminders = async () => {
        try {
            setSending(true);
            const res = await api.post(`/admin/reminders/send?target_date=${date}`, {}, token!);
            showToast(res.message || "提醒郵件已發送", "success");
        } catch (error: any) {
            showToast(error.message || "發送提醒失敗", "error");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-6">訂餐提醒</h2>

            <div className="mb-6 flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                    <label className="block text-gray-700 mb-2 font-medium">查詢日期</label>
                    <input
                        type="date"
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                    />
                </div>
                <div className="flex items-end">
                    <LoadingButton
                        loading={sending}
                        onClick={sendReminders}
                        disabled={missingUsers.length === 0}
                        className={`px-6 py-2 rounded transition font-medium ${missingUsers.length === 0
                                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                : "bg-blue-500 text-white hover:bg-blue-600"
                            }`}
                    >
                        發送群組提醒郵件
                    </LoadingButton>
                </div>
            </div>

            {loading ? (
                <Loading />
            ) : (
                <>
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-bold mb-2">
                            未訂餐人數：
                            <span className={missingUsers.length > 0 ? "text-red-600" : "text-green-600"}>
                                {missingUsers.length}
                            </span>
                        </h3>
                    </div>

                    {missingUsers.length === 0 ? (
                        <div className="text-center text-green-600 py-8">
                            <p className="text-lg font-medium">太棒了！所有人都已完成訂餐</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-100 border-b">
                                        <th className="text-left p-3 font-semibold">工號</th>
                                        <th className="text-left p-3 font-semibold">姓名</th>
                                        <th className="text-left p-3 font-semibold">信箱</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {missingUsers.map((user) => (
                                        <tr key={user.employee_id} className="border-b hover:bg-gray-50">
                                            <td className="p-3 font-mono">{user.employee_id}</td>
                                            <td className="p-3">{user.name}</td>
                                            <td className="p-3 text-sm text-gray-600">{user.email}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
