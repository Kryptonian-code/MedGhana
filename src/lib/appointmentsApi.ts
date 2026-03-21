import { apiRequest } from "@/lib/api";
import type { Appointment } from "@/types";

export interface AppointmentPayload {
  patient_id: number;
  doctor_name: string;
  department_name: string;
  appointment_date: string;
  appointment_time: string;
  type: "new_visit" | "follow_up" | "emergency" | "referral";
  notes?: string;
}

export function listAppointments() {
  return apiRequest<{ appointments: Appointment[] }>("/appointments/index.php");
}

export function createAppointment(payload: AppointmentPayload) {
  return apiRequest<{ message: string; appointment_id: number; reference_code: string; sms_booking_status: string; sms_booking_error?: string | null }>("/appointments/index.php", {
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

export function resendAppointmentBookingSms(id: string | number) {
  return apiRequest<{ message: string; sms_status: string; error?: string | null }>("/appointments/resend-sms.php", {
    method: "POST",
    body: JSON.stringify({ id }),
  });
}
