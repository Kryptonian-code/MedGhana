import { apiRequest } from "@/lib/api";
import type { Admission, Ward } from "@/types";

export interface AdmissionPayload {
  patient_id: number;
  ward_id: number;
  bed_number: string;
  admission_date: string;
  reason: string;
}

export function listAdmissions() {
  return apiRequest<{ wards: Ward[]; admissions: Array<Admission & { patient_name?: string; hospital_number?: string; ward_name?: string }> }>("/admissions/index.php");
}

export function createAdmission(payload: AdmissionPayload) {
  return apiRequest<{ message: string }>("/admissions/index.php", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateAdmissionStatus(id: string | number, status: "discharged" | "transferred", discharge_date: string) {
  return apiRequest<{ message: string }>("/admissions/status.php", {
    method: "POST",
    body: JSON.stringify({ id, status, discharge_date }),
  });
}
