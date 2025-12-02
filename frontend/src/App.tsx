import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./features/auth/AuthContext";
import { LoginPage } from "./features/auth/LoginPage";
import { CalendarOrdering } from "./features/orders/CalendarOrdering";
import { LegacyCalendarOrdering } from "./features/orders/LegacyCalendarOrdering";
import { ChangePassword } from "./features/auth/ChangePassword";
import { AdminDashboard } from "./features/admin/AdminDashboard";
import { MyOrders } from "./features/orders/MyOrders";
import { ExtensionDirectory } from "./features/extension-table/ExtensionDirectory";
import { ToastProvider } from "./components/Toast";
import { Navbar } from "./components/Navbar";
import { Loading } from "./components/Loading";
import { UIVersionProvider, useUIVersion } from "./context/UIVersionContext";

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return <Loading fullScreen />;
  }

  return token ? <>{children}</> : <Navigate to="/login" />;
};

// 根據 UI 版本切換顯示新版或舊版訂餐介面
const OrderingPage: React.FC = () => {
  const { uiVersion } = useUIVersion();
  return uiVersion === "legacy" ? <LegacyCalendarOrdering /> : <CalendarOrdering />;
};

function App() {
  return (
    <AuthProvider>
      <UIVersionProvider>
        <ToastProvider>
          <Router>
            <Navbar />
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/extension-directory"
                element={
                  <ProtectedRoute>
                    <ExtensionDirectory />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <OrderingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-orders"
                element={
                  <ProtectedRoute>
                    <MyOrders />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/change-password"
                element={
                  <ProtectedRoute>
                    <ChangePassword />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Router>
        </ToastProvider>
      </UIVersionProvider>
    </AuthProvider>
  );
}

export default App;
