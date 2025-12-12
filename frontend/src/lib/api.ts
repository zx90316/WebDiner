// 使用 /api 前綴，讓 vite proxy 代理請求（支援內網 IP 訪問）
const API_URL = "/api";

export const api = {
    async get(endpoint: string, token?: string) {
        const headers: HeadersInit = {
            "Content-Type": "application/json",
        };
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: "GET",
            headers,
        });
        return handleResponse(response);
    },

    async post(endpoint: string, body: any, token?: string) {
        const headers: HeadersInit = {
            "Content-Type": "application/json",
        };
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
        // For login form data
        if (endpoint === "/auth/login") {
            const formData = new URLSearchParams();
            for (const key in body) {
                formData.append(key, body[key]);
            }
            const response = await fetch(`${API_URL}${endpoint}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: formData,
            });
            return handleResponse(response);
        }

        const response = await fetch(`${API_URL}${endpoint}`, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
        });
        return handleResponse(response);
    },

    async put(endpoint: string, body: any, token?: string) {
        const headers: HeadersInit = {
            "Content-Type": "application/json",
        };
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: "PUT",
            headers,
            body: JSON.stringify(body),
        });
        return handleResponse(response);
    },

    async delete(endpoint: string, token?: string) {
        const headers: HeadersInit = {
            "Content-Type": "application/json",
        };
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: "DELETE",
            headers,
        });
        return handleResponse(response);
    }
};

async function handleResponse(response: Response) {
    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Unknown error" }));
        const errorObj = new Error(error.detail || "Request failed");
        (errorObj as any).detail = error.detail;
        throw errorObj;
    }
    return response.json();
}
