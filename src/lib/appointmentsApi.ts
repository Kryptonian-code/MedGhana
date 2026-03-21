import { apiRequest } from "@/lib/api";
import type { Appointment } from "@/types";

export interface AppointmentPayload {
  patient_id: number;
  doctor_name: string;
  appointment_date: string;
  appointment_time: string;
  type: "new_visit" | "follow_up" | "emergency" | "referral";
  notes?: string;
}

export function listAppointments() {
  return apiRequest<{ appointments: Appointment[] }>("/appointments/index.php");
}

export function createAppointment(payload: AppointmentPayload) {
  return apiRequest<{ message: string }>("/appointments/index.php", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateAppointmentStatus(id: string | number, status: Appointment["status"]) {
  return apiRequest<{ message: string }>("/appointments/status.php", {
    method: "POST",
    body: JSON.stringify({ id, status }),
  });
}
