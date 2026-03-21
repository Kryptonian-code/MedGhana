import { apiRequest } from "@/lib/api";
import type { Consultation, Visit } from "@/types";

export interface ConsultationPayload {
  visit_id: number;
  patient_id: number;
  presenting_complaint: string;
  history_of_present_illness?: string;
  examination_findings?: string;
  diagnosis: string;
  icd_code?: string;
  treatment_plan?: string;
  notes?: string;
  prescriptions?: Array<{
    drug_id?: number | null;
    drug_name: string;
    dosage: string;
    frequency: string;
    duration: string;
    quantity: number;
    instructions?: string;
  }>;
  lab_orders?: Array<{
    test_name: string;
    test_category: string;
    priority: "routine" | "urgent" | "stat";
    sample_type?: string;
    clinical_notes?: string;
  }>;
}

interface ConsultationsResponse {
  pending_visits: Visit[];
  consultations: Consultation[];
}

export function listConsultations() {
  return apiRequest<ConsultationsResponse>("/consultations/index.php");
}

export function createConsultation(payload: ConsultationPayload) {
  return apiRequest<{ message: string }>("/consultations/index.php", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
