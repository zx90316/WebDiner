import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "../../lib/api";

interface User {
    id: number;
    employee_id: string;
    name: string;
    email: string;
    is_admin: boolean;
    is_active: boolean;
    role?: string;  // user, admin, sysadmin
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (employeeId: string, password: string) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
    const [isLoading, setIsLoading] = useState(true);

    // Fetch current user info when token exists
    useEffect(() => {
        const fetchUser = async () => {
            if (token) {
                try {
                    // Try to get current user from token
                    const response = await api.get("/auth/me", token);
                    setUser(response);
                } catch (error) {
                    console.error("Failed to fetch user:", error);
                    // Token might be invalid, clear it
                    logout();
                }
            }
            setIsLoading(false);
        };
        fetchUser();
    }, [token]);

    const login = async (employeeId: string, password: string) => {
        const data = await api.post("/auth/login", { username: employeeId, password });
        setToken(data.access_token);
        localStorage.setItem("token", data.access_token);

        // Fetch user details immediately after login
        try {
            const userResponse = await api.get("/auth/me", data.access_token);
            setUser(userResponse);
        } catch (error) {
            console.error("Failed to fetch user details:", error);
        }
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem("token");
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
