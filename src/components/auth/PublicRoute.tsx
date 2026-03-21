import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

export function PublicRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const role = useAuthStore((state) => state.user?.role);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Preparing sign-in...</div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={role === "super_admin" ? "/owner/dashboard" : "/dashboard"} replace />;
  }

  return <Outlet />;
}
