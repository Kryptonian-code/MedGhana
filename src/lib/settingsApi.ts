import { apiRequest } from "@/lib/api";

export interface HospitalSettings {
  hospital_name: string;
  license_number?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  auto_generate_hospital_numbers: boolean | number;
  nhis_integration_enabled: boolean | number;
  sms_notifications_enabled: boolean | number;
  receipt_auto_print_enabled: boolean | number;
}

export function getSettings() {
  return apiRequest<{ settings: HospitalSettings }>("/settings/index.php");
}

export function saveSettings(payload: HospitalSettings) {
  return apiRequest<{ message: string }>("/settings/index.php", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
