import { apiRequest } from "@/lib/api";
import type { AuthUser } from "@/types";

export interface ProfilePayload {
  full_name: string;
  email: string;
  phone?: string;
  current_password?: string;
  new_password?: string;
  confirm_password?: string;
}

export function getProfile() {
  return apiRequest<{ profile: AuthUser }>("/profile/index.php");
}

export function saveProfile(payload: ProfilePayload) {
  return apiRequest<{ message: string }>("/profile/index.php", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
