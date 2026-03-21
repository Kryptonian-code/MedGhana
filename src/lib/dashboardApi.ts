import { apiRequest } from "@/lib/api";
import type { AppNotification } from "@/types";

export interface DashboardResponse {
  stats: {
    patients_today: number;
    appointments_today: number;
    waiting_triage: number;
    ready_for_consultation: number;
    pending_bills: number;
    revenue_today: number;
  };
  notifications: AppNotification[];
}

export function getDashboardOverview() {
  return apiRequest<DashboardResponse>("/dashboard/index.php");
}
