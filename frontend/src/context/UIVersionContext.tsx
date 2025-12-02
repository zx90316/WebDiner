import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

type UIVersion = "new" | "legacy";

interface UIVersionContextType {
    uiVersion: UIVersion;
    toggleUIVersion: () => void;
    setUIVersion: (version: UIVersion) => void;
}

const UIVersionContext = createContext<UIVersionContextType | undefined>(undefined);

const UI_VERSION_KEY = "vscc_ui_version";

export const UIVersionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [uiVersion, setUIVersionState] = useState<UIVersion>(() => {
        // 從 localStorage 讀取用戶上次選擇的版本，預設為新版
        const saved = localStorage.getItem(UI_VERSION_KEY);
        return (saved === "legacy" ? "legacy" : "new") as UIVersion;
    });

    // 當版本改變時，儲存到 localStorage
    useEffect(() => {
        localStorage.setItem(UI_VERSION_KEY, uiVersion);
    }, [uiVersion]);

    const toggleUIVersion = () => {
        setUIVersionState((prev) => (prev === "new" ? "legacy" : "new"));
    };

    const setUIVersion = (version: UIVersion) => {
        setUIVersionState(version);
    };

    return (
        <UIVersionContext.Provider value={{ uiVersion, toggleUIVersion, setUIVersion }}>
            {children}
        </UIVersionContext.Provider>
    );
};

export const useUIVersion = () => {
    const context = useContext(UIVersionContext);
    if (!context) {
        throw new Error("useUIVersion must be used within a UIVersionProvider");
    }
    return context;
};

