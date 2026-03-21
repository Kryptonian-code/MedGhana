import { apiRequest } from "@/lib/api";
import type { User, UserRole } from "@/types";

export interface StaffMember extends User {
  status: "active" | "inactive";
  branch_name?: string | null;
  created_at?: string;
}

export interface CreateStaffPayload {
  full_name: string;
  email: string;
  phone?: string;
  role: Exclude<UserRole, "super_admin">;
  password: string;
  branch_id?: number | null;
}

export function listStaff() {
  return apiRequest<{ staff: StaffMember[] }>("/staff/index.php");
}

export function createStaff(payload: CreateStaffPayload) {
  return apiRequest<{ message: string }>("/staff/index.php", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateStaff(id: string | number, role: Exclude<UserRole, "super_admin">, status: "active" | "inactive") {
  return apiRequest<{ message: string }>("/staff/update.php", {
    method: "POST",
    body: JSON.stringify({ id, role, status }),
  });
}
