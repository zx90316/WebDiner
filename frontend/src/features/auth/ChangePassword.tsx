import React, { useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "./AuthContext";
import { useToast } from "../../components/Toast";
import { LoadingButton } from "../../components/Loading";

export const ChangePassword: React.FC = () => {
    const { token } = useAuth();
    const { showToast } = useToast();
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        old_password: "",
        new_password: "",
        confirm_password: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.new_password !== formData.confirm_password) {
            showToast("新密碼與確認密碼不符", "error");
            return;
        }

        if (formData.new_password.length < 6) {
            showToast("新密碼長度至少需 6 碼", "error");
            return;
        }

        try {
            setSubmitting(true);
            await api.post("/auth/change-password", {
                old_password: formData.old_password,
                new_password: formData.new_password,
            }, token!);

            showToast("密碼修改成功", "success");
            setFormData({
                old_password: "",
                new_password: "",
                confirm_password: "",
            });
        } catch (error: any) {
            showToast(error.message || "密碼修改失敗", "error");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-md mx-auto mt-10 bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-6 text-center">修改密碼</h2>
            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label className="block text-gray-700 mb-2 font-medium">舊密碼</label>
                    <input
                        type="password"
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={formData.old_password}
                        onChange={(e) => setFormData({ ...formData, old_password: e.target.value })}
                        required
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-gray-700 mb-2 font-medium">新密碼</label>
                    <input
                        type="password"
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={formData.new_password}
                        onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
                        required
                    />
                </div>
                <div className="mb-6">
                    <label className="block text-gray-700 mb-2 font-medium">確認新密碼</label>
                    <input
                        type="password"
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={formData.confirm_password}
                        onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                        required
                    />
                </div>
                <LoadingButton
                    type="submit"
                    loading={submitting}
                    className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
                >
                    確認修改
                </LoadingButton>
            </form>
        </div>
    );
};
