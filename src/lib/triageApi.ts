import { apiRequest } from "@/lib/api";
import type { Visit } from "@/types";

export interface TriagePayload {
  visit_id: number;
  patient_id: number;
  temperature?: string;
  pulse?: string;
  respiratory_rate?: string;
  blood_pressure_systolic?: string;
  blood_pressure_diastolic?: string;
  oxygen_saturation?: string;
  weight?: string;
  height?: string;
  notes?: string;
}

export interface WalkInVisitPayload {
  patient_id: number;
  visit_date: string;
  visit_time: string;
  complaint?: string;
}

export function listVisitsForTriage() {
  return apiRequest<{ visits: Visit[] }>("/triage/index.php");
}

export function createTriageRecord(payload: TriagePayload) {
  return apiRequest<{ message: string }>("/triage/index.php", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function createWalkInVisit(payload: WalkInVisitPayload) {
  return apiRequest<{ message: string }>("/visits/index.php", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
