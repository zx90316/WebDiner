import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { useUIVersion } from "../context/UIVersionContext";
import { TimeDisplay } from "./TimeDisplay";

export const Navbar: React.FC = () => {
    const { user, logout } = useAuth();
    const { uiVersion, toggleUIVersion } = useUIVersion();
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        if (confirm("確定要登出嗎？")) {
            logout();
            navigate("/login");
        }
    };

    const isActive = (path: string) => location.pathname === path;

    const closeMobileMenu = () => setIsMobileMenuOpen(false);

    // 未登入時顯示簡化的導航列
    if (!user) {
        return (
            <nav className="bg-white shadow-md">
                <div className="container mx-auto px-4">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center space-x-4 md:space-x-8">
                            <h1 className="text-xl font-bold text-blue-600">VSCC 伙食系統</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <Link
                                to="/login"
                                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                                登入
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>
        );
    }

    return (
        <nav className="bg-white shadow-md">
            <div className="container mx-auto px-4">
                <div className="flex justify-between items-center h-16">
                    <div className="flex items-center space-x-4 lg:space-x-8">
                        <h1 className="text-lg md:text-xl font-bold text-blue-600">VSCC 伙食系統</h1>
                        {/* 桌面端導航連結 */}
                        <div className="hidden md:flex space-x-2 lg:space-x-4">
                            <Link
                                to="/"
                                className={`px-2 lg:px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${isActive("/")
                                    ? "bg-blue-100 text-blue-700"
                                    : "text-gray-700 hover:bg-gray-100"
                                    }`}
                            >
                                點餐
                            </Link>
                            <Link
                                to="/my-orders"
                                className={`px-2 lg:px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${isActive("/my-orders")
                                    ? "bg-blue-100 text-blue-700"
                                    : "text-gray-700 hover:bg-gray-100"
                                    }`}
                            >
                                我的訂單
                            </Link>
                            <Link
                                to="/extension-directory"
                                className={`px-2 lg:px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${isActive("/extension-directory")
                                    ? "bg-blue-100 text-blue-700"
                                    : "text-gray-700 hover:bg-gray-100"
                                    }`}
                            >
                                📞 分機表
                            </Link>
                            {user.is_admin && (
                                <Link
                                    to="/admin"
                                    className={`px-2 lg:px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${isActive("/admin")
                                        ? "bg-blue-100 text-blue-700"
                                        : "text-gray-700 hover:bg-gray-100"
                                        }`}
                                >
                                    管理後台
                                </Link>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center space-x-2 lg:space-x-4">
                        {/* 時間顯示 - 桌面端 */}
                        <div className="hidden lg:block border-r pr-4 mr-2">
                            <TimeDisplay isSysAdmin={user.role === 'sysadmin'} />
                        </div>
                        {/* UI 版本切換開關 - 桌面端 */}
                        <div className="hidden lg:flex items-center space-x-2 border-r pr-4 mr-2">
                            <span className="text-xs text-gray-500">介面:</span>
                            <button
                                onClick={toggleUIVersion}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                    uiVersion === "legacy" ? "bg-amber-500" : "bg-blue-500"
                                }`}
                                title={uiVersion === "legacy" ? "切換到新版介面" : "切換到舊版介面"}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                        uiVersion === "legacy" ? "translate-x-6" : "translate-x-1"
                                    }`}
                                />
                            </button>
                            <span className={`text-xs font-medium ${
                                uiVersion === "legacy" ? "text-amber-600" : "text-blue-600"
                            }`}>
                                {uiVersion === "legacy" ? "舊版" : "新版"}
                            </span>
                        </div>
                        {/* 用戶資訊 - 桌面端 */}
                        <span className="hidden md:inline text-sm text-gray-600">{user.name}</span>
                        <Link
                            to="/change-password"
                            className="hidden md:inline text-sm text-blue-600 hover:text-blue-800"
                        >
                            修改密碼
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="hidden md:inline text-sm text-red-600 hover:text-red-800"
                        >
                            登出
                        </button>
                        {/* 移動端漢堡菜單按鈕 */}
                        <button
                            className="md:hidden p-2 rounded-md hover:bg-gray-100"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {isMobileMenuOpen ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                )}
                            </svg>
                        </button>
                    </div>
                </div>
                {/* 移動端菜單 */}
                {isMobileMenuOpen && (
                    <div className="md:hidden pb-4 border-t">
                        {/* 導航連結 */}
                        <div className="pt-2 space-y-1">
                            <Link
                                to="/"
                                onClick={closeMobileMenu}
                                className={`block px-3 py-2 rounded-md text-sm font-medium ${isActive("/")
                                    ? "bg-blue-100 text-blue-700"
                                    : "text-gray-700 hover:bg-gray-100"
                                    }`}
                            >
                                點餐
                            </Link>
                            <Link
                                to="/my-orders"
                                onClick={closeMobileMenu}
                                className={`block px-3 py-2 rounded-md text-sm font-medium ${isActive("/my-orders")
                                    ? "bg-blue-100 text-blue-700"
                                    : "text-gray-700 hover:bg-gray-100"
                                    }`}
                            >
                                我的訂單
                            </Link>
                            <Link
                                to="/extension-directory"
                                onClick={closeMobileMenu}
                                className={`block px-3 py-2 rounded-md text-sm font-medium ${isActive("/extension-directory")
                                    ? "bg-blue-100 text-blue-700"
                                    : "text-gray-700 hover:bg-gray-100"
                                    }`}
                            >
                                📞 分機表
                            </Link>
                            {user.is_admin && (
                                <Link
                                    to="/admin"
                                    onClick={closeMobileMenu}
                                    className={`block px-3 py-2 rounded-md text-sm font-medium ${isActive("/admin")
                                        ? "bg-blue-100 text-blue-700"
                                        : "text-gray-700 hover:bg-gray-100"
                                        }`}
                                >
                                    管理後台
                                </Link>
                            )}
                        </div>
                        {/* 分隔線 */}
                        <div className="border-t mt-2 pt-2">
                            {/* 時間顯示 - 移動端 */}
                            <div className="px-3 py-2">
                                <TimeDisplay isSysAdmin={user.role === 'sysadmin'} />
                            </div>
                            {/* UI 版本切換 - 移動端 */}
                            <div className="flex items-center justify-between px-3 py-2">
                                <span className="text-sm text-gray-600">介面版本</span>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={toggleUIVersion}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                            uiVersion === "legacy" ? "bg-amber-500" : "bg-blue-500"
                                        }`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                uiVersion === "legacy" ? "translate-x-6" : "translate-x-1"
                                            }`}
                                        />
                                    </button>
                                    <span className={`text-xs font-medium ${
                                        uiVersion === "legacy" ? "text-amber-600" : "text-blue-600"
                                    }`}>
                                        {uiVersion === "legacy" ? "舊版" : "新版"}
                                    </span>
                                </div>
                            </div>
                            {/* 用戶資訊 */}
                            <div className="px-3 py-2 text-sm text-gray-600">
                                👤 {user.name}
                            </div>
                            <Link
                                to="/change-password"
                                onClick={closeMobileMenu}
                                className="block px-3 py-2 text-sm text-blue-600 hover:bg-gray-100"
                            >
                                修改密碼
                            </Link>
                            <button
                                onClick={() => {
                                    closeMobileMenu();
                                    handleLogout();
                                }}
                                className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-100"
                            >
                                登出
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
};
