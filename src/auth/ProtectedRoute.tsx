import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./authContext";

export function ProtectedRoute() {
  const { loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div role="status">Checking your session…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
