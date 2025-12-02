import React, { useEffect, useState, useRef } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../../components/Toast";
import { Loading } from "../../components/Loading";

interface OrderPerson {
    employee_id: string;
    name: string;
}

interface AnnouncementItem {
    vendor_id: number;
    vendor_name: string;
    vendor_color: string;
    item_id: number;
    item_name: string;
    item_description: string;
    orders: OrderPerson[];
}

interface AnnouncementData {
    date: string;
    items: AnnouncementItem[];
}

export const OrderAnnouncementView: React.FC = () => {
    const [data, setData] = useState<AnnouncementData | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const { token } = useAuth();
    const { showToast } = useToast();
    const printRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadData();
    }, [selectedDate]);

    const loadData = async () => {
        try {
            setLoading(true);
            const result = await api.get(`/admin/order_announcement?date=${selectedDate}`, token!);
            setData(result);
        } catch (error) {
            showToast("載入訂餐公告資料失敗", "error");
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        const printContent = printRef.current;
        if (!printContent) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            showToast("無法開啟列印視窗，請檢查瀏覽器設定", "error");
            return;
        }

        const formattedDate = new Date(selectedDate).toLocaleDateString('zh-TW', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
        });

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>訂餐公告 - ${formattedDate}</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        font-family: "Microsoft JhengHei", "微軟正黑體", Arial, sans-serif;
                        padding: 20px;
                        background: white;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 24px;
                        padding-bottom: 16px;
                        border-bottom: 3px solid #333;
                    }
                    .header h1 {
                        font-size: 28px;
                        font-weight: bold;
                        margin-bottom: 8px;
                    }
                    .header .date {
                        font-size: 18px;
                        color: #555;
                    }
                    .grid {
                        display: grid;
                        grid-template-columns: repeat(3, 1fr);
                        gap: 16px;
                    }
                    .item-card {
                        border: 2px solid #333;
                        border-radius: 8px;
                        padding: 12px;
                        page-break-inside: avoid;
                    }
                    .item-header {
                        border-bottom: 1px solid #ccc;
                        padding-bottom: 8px;
                        margin-bottom: 8px;
                    }
                    .vendor-name {
                        font-size: 14px;
                        font-weight: bold;
                        color: #666;
                        margin-bottom: 4px;
                    }
                    .item-name {
                        font-size: 18px;
                        font-weight: bold;
                    }
                    .item-desc {
                        font-size: 12px;
                        color: #777;
                        margin-top: 2px;
                    }
                    .order-count {
                        font-size: 14px;
                        font-weight: bold;
                        color: #333;
                        margin-bottom: 8px;
                    }
                    .orders-list {
                        display: flex;
                        flex-direction: column;
                        gap: 4px;
                    }
                    .order-person {
                        border: 1px solid #333;
                        padding: 4px 8px;
                        border-radius: 4px;
                        font-size: 12px;
                    }
                    .order-person .emp-id {
                        font-weight: bold;
                        color: #555;
                    }
                    @media print {
                        body {
                            padding: 10px;
                        }
                        .grid {
                            grid-template-columns: repeat(3, 1fr);
                        }
                        .item-card {
                            break-inside: avoid;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>訂餐公告</h1>
                    <div class="date">${formattedDate}</div>
                </div>
                <div class="grid">
                    ${data?.items.map(item => `
                        <div class="item-card">
                            <div class="item-header">
                                <div class="vendor-name">${item.vendor_name}</div>
                                <div class="item-name">${item.item_name}</div>
                                ${item.item_description ? `<div class="item-desc">${item.item_description}</div>` : ''}
                            </div>
                            <div class="order-count">訂購人數：${item.orders.length} 人</div>
                            <div class="orders-list">
                                ${item.orders.map(person => `
                                    <div class="order-person">
                                        <span class="emp-id">${person.employee_id}</span> ${person.name}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('') || '<p>此日期尚無訂單</p>'}
                </div>
            </body>
            </html>
        `);

        printWindow.document.close();
        printWindow.focus();
        
        // 等待內容載入後列印
        setTimeout(() => {
            printWindow.print();
        }, 250);
    };

    const formattedDate = new Date(selectedDate).toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
    });

    if (loading && !data) return <Loading />;

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            {/* 標題區 */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-bold">📋 訂餐公告</h2>
                    <p className="text-gray-500 mt-1">依品項顯示訂餐人員，可列印張貼</p>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="border rounded-lg px-4 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        onClick={loadData}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        重新整理
                    </button>
                    <button
                        onClick={handlePrint}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                    >
                        <span>🖨️</span>
                        <span>列印公告</span>
                    </button>
                </div>
            </div>

            {/* 日期顯示 */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="text-center">
                    <span className="text-xl font-bold text-blue-800">{formattedDate}</span>
                    {data && (
                        <span className="ml-4 text-gray-600">
                            共 {data.items.length} 個品項，{data.items.reduce((sum, item) => sum + item.orders.length, 0)} 人訂餐
                        </span>
                    )}
                </div>
            </div>

            {/* 品項列表 */}
            <div ref={printRef} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {data?.items.length === 0 ? (
                    <div className="col-span-3 text-center py-12 text-gray-500">
                        此日期尚無訂單
                    </div>
                ) : (
                    data?.items.map((item) => (
                        <div
                            key={`${item.vendor_id}-${item.item_id}`}
                            className="border-2 rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
                            style={{ borderColor: item.vendor_color }}
                        >
                            {/* 品項標題 */}
                            <div
                                className="p-4"
                                style={{ backgroundColor: `${item.vendor_color}15` }}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <span
                                        className="px-2 py-1 rounded text-xs font-bold text-white"
                                        style={{ backgroundColor: item.vendor_color }}
                                    >
                                        {item.vendor_name}
                                    </span>
                                </div>
                                <h3 className="text-xl font-bold text-gray-800">
                                    {item.item_name}
                                </h3>
                                {item.item_description && (
                                    <p className="text-sm text-gray-600 mt-1">
                                        {item.item_description}
                                    </p>
                                )}
                            </div>

                            {/* 訂購人員列表 */}
                            <div className="p-4 bg-white">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-medium text-gray-600">
                                        訂購人員
                                    </span>
                                    <span
                                        className="px-3 py-1 rounded-full text-sm font-bold text-white"
                                        style={{ backgroundColor: item.vendor_color }}
                                    >
                                        {item.orders.length} 人
                                    </span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    {item.orders.map((person) => (
                                        <div
                                            key={person.employee_id}
                                            className="bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg text-sm transition-colors"
                                        >
                                            <span className="font-mono font-bold text-gray-600 mr-2">
                                                {person.employee_id}
                                            </span>
                                            <span className="text-gray-800">
                                                {person.name}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

