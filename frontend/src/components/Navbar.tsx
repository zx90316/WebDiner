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

    if (!user) return null;

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
