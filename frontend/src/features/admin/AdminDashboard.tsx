import React, { useState } from "react";
import { StatsView } from "./StatsView";
import { RemindersView } from "./RemindersView";
import { VendorManager } from "./VendorManager";
import { VendorMenuEditor } from "./VendorMenuEditor";
import { UserManagement } from "./UserManagement";
import { UserOrderingSettings } from "./UserOrderingSettings";
import { DepartmentManager } from "./DepartmentManager";
import { HolidayManager } from "./HolidayManager";


export const AdminDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState("vendors");

    const tabs = [
        { id: "vendors", name: "廠商管理", icon: "🏪" },
        { id: "menu", name: "菜單設定", icon: "🍽️" },
        { id: "departments", name: "部門管理", icon: "🏢" },
        { id: "users", name: "用戶管理", icon: "👥" },
        { id: "orders", name: "人員訂餐設定", icon: "📅" },
        { id: "holidays", name: "節假日管理", icon: "🗓️" },
        { id: "stats", name: "統計資料", icon: "📊" },
        { id: "reminders", name: "訂餐提醒", icon: "📧" },
    ];

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="container mx-auto px-4">
                <h1 className="text-3xl font-bold mb-8">管理後台</h1>

                <div className="mb-6 bg-white rounded-lg shadow">
                    <div className="flex border-b overflow-x-auto">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                className={`flex items-center gap-2 px-6 py-4 font-medium transition whitespace-nowrap ${activeTab === tab.id
                                    ? "border-b-2 border-blue-500 text-blue-600"
                                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                                    }`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <span>{tab.icon}</span>
                                <span>{tab.name}</span>
                            </button>
                        ))}
                    </div>

                    <div className="p-6">
                        {activeTab === "vendors" && <VendorManager />}
                        {activeTab === "menu" && <VendorMenuEditor />}
                        {activeTab === "departments" && <DepartmentManager />}
                        {activeTab === "users" && <UserManagement />}
                        {activeTab === "orders" && <UserOrderingSettings />}
                        {activeTab === "holidays" && <HolidayManager />}
                        {activeTab === "stats" && <StatsView />}
                        {activeTab === "reminders" && <RemindersView />}
                    </div>
                </div>
            </div>
        </div>
    );
};
