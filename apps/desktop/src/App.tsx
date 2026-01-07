import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./store/auth";
import History from "./pages/History";
import Login from "./pages/Login";
import Reports from "./pages/Reports";
import Receive from "./pages/Receive";
import Inventory from "./pages/Inventory";
import Sales from "./pages/Sales";
import Settings from "./pages/Settings";

import DashboardLayout from "./ui/DashboardLayout";

function PrivateRoute({ children }: { children: JSX.Element }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { hydrate } = useAuth();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <PrivateRoute>
            <DashboardLayout />
          </PrivateRoute>
        }
      >
        {/* app ochilganda default */}
        <Route index element={<Navigate to="/reports" replace />} />

        <Route path="reports" element={<Reports />} />
        <Route path="receive" element={<Receive />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="sales" element={<Sales />} />
        <Route path="/history" element={<History />} />
        <Route path="settings" element={<Settings />} />

        {/* eski yo'llar bo'lsa ham reportsga ketadi */}
        <Route path="dashboard" element={<Navigate to="/reports" replace />} />
        <Route path="home" element={<Navigate to="/reports" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/reports" replace />} />
    </Routes>
  );
}
