import { apiRequest } from "@/lib/api";
import type { Patient, PatientDetailResponse } from "@/types";

interface PatientsResponse {
  patients: Patient[];
}

interface CreatePatientResponse {
  patient: Patient;
  message: string;
}

export interface CreatePatientPayload {
  first_name: string;
  last_name: string;
  other_names?: string;
  gender: "male" | "female";
  date_of_birth: string;
  phone: string;
  email?: string;
  address?: string;
  town?: string;
  region?: string;
  national_id_type?: string;
  national_id_number?: string;
  nhis_number?: string;
  nhis_expiry?: string;
  insurance_type?: "nhis" | "private" | "none";
  blood_group?: string;
  genotype?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  next_of_kin_name?: string;
  next_of_kin_phone?: string;
  next_of_kin_relationship?: string;
}

export function listPatients() {
  return apiRequest<PatientsResponse>("/patients/index.php");
}

export function createPatient(payload: CreatePatientPayload) {
  return apiRequest<CreatePatientResponse>("/patients/index.php", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getPatient(id: string | number) {
  return apiRequest<PatientDetailResponse>(`/patients/show.php?id=${id}`);
}
