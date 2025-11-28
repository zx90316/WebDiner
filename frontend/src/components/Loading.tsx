import React from "react";

export const Loading: React.FC<{ fullScreen?: boolean }> = ({ fullScreen = false }) => {
    const className = fullScreen
        ? "fixed inset-0 flex items-center justify-center bg-gray-50 bg-opacity-75 z-50"
        : "flex items-center justify-center p-8";

    return (
        <div className={className}>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );
};

export const LoadingButton: React.FC<{ loading: boolean; children: React.ReactNode; className?: string; onClick?: () => void; disabled?: boolean; type?: "button" | "submit" }> = ({
    loading,
    children,
    className = "",
    onClick,
    disabled,
    type = "button",
}) => {
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={loading || disabled}
            className={`relative ${className} ${loading || disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
            {loading && (
                <span className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
                </span>
            )}
            <span className={loading ? "invisible" : ""}>{children}</span>
        </button>
    );
};
