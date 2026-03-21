import { useAuthStore } from "@/stores/authStore";
import { canPerformAction, type AppAction } from "@/lib/permissions";

export function usePermissions() {
  const role = useAuthStore((state) => state.user?.role);

  return {
    role,
    can: (action: AppAction) => canPerformAction(role, action),
  };
}
