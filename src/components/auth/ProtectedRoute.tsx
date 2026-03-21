import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import type { UserRole } from "@/types";

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const user = useAuthStore((state) => state.user);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading your workspace...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={location.pathname.startsWith("/owner") ? "/owner/login" : "/login"} replace state={{ from: location }} />;
  }

  if (allowedRoles && allowedRoles.length > 0 && (!user || !allowedRoles.includes(user.role))) {
    return <Navigate to="/access-denied" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
