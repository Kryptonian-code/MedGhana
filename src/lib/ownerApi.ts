import { apiRequest } from "@/lib/api";
import type { AuditEvent } from "@/types";

export interface OwnerDashboardResponse {
  stats: {
    hospitals: number;
    branches: number;
    users: number;
    patients: number;
    queued_sms: number;
    unread_notifications: number;
    audit_events: number;
  };
  hospitals: Array<{
    id: string;
    name: string;
    code: string;
    status: string;
    created_at: string;
    branch_count: number;
    user_count: number;
    patient_count: number;
  }>;
  recent_sms: Array<{
    id: string;
    phone_number: string;
    context: string;
    status: string;
    created_at: string;
    sent_at?: string | null;
  }>;
  recent_audits: AuditEvent[];
}

export function getOwnerDashboard() {
  return apiRequest<OwnerDashboardResponse>("/owner/dashboard.php");
}
