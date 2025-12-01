import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";

export const Navbar: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        if (confirm("確定要登出嗎？")) {
            logout();
            navigate("/login");
        }
    };

    const isActive = (path: string) => location.pathname === path;

    // 未登入時顯示簡化的導航列（只有分機表）
    if (!user) {
        return (
            <nav className="bg-white shadow-md">
                <div className="container mx-auto px-4">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center space-x-8">
                            <h1 className="text-xl font-bold text-blue-600">WebDiner</h1>
                            <div className="flex space-x-4">
                                <Link
                                    to="/extension-directory"
                                    className={`px-3 py-2 rounded-md text-sm font-medium ${isActive("/extension-directory")
                                        ? "bg-blue-100 text-blue-700"
                                        : "text-gray-700 hover:bg-gray-100"
                                        }`}
                                >
                                    📞 分機表
                                </Link>
                            </div>
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
                    <div className="flex items-center space-x-8">
                        <h1 className="text-xl font-bold text-blue-600">WebDiner</h1>
                        <div className="flex space-x-4">
                            <Link
                                to="/"
                                className={`px-3 py-2 rounded-md text-sm font-medium ${isActive("/")
                                    ? "bg-blue-100 text-blue-700"
                                    : "text-gray-700 hover:bg-gray-100"
                                    }`}
                            >
                                點餐
                            </Link>
                            <Link
                                to="/my-orders"
                                className={`px-3 py-2 rounded-md text-sm font-medium ${isActive("/my-orders")
                                    ? "bg-blue-100 text-blue-700"
                                    : "text-gray-700 hover:bg-gray-100"
                                    }`}
                            >
                                我的訂單
                            </Link>
                            <Link
                                to="/extension-directory"
                                className={`px-3 py-2 rounded-md text-sm font-medium ${isActive("/extension-directory")
                                    ? "bg-blue-100 text-blue-700"
                                    : "text-gray-700 hover:bg-gray-100"
                                    }`}
                            >
                                📞 分機表
                            </Link>
                            {user.is_admin && (
                                <Link
                                    to="/admin"
                                    className={`px-3 py-2 rounded-md text-sm font-medium ${isActive("/admin")
                                        ? "bg-blue-100 text-blue-700"
                                        : "text-gray-700 hover:bg-gray-100"
                                        }`}
                                >
                                    管理後台
                                </Link>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-600">{user.name}</span>
                        <Link
                            to="/change-password"
                            className="text-sm text-blue-600 hover:text-blue-800"
                        >
                            修改密碼
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="text-sm text-red-600 hover:text-red-800"
                        >
                            登出
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
};
