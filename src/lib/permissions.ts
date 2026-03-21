import type { UserRole } from "@/types";

export type AppAction =
  | "patients.view"
  | "patients.create"
  | "appointments.view"
  | "appointments.create"
  | "appointments.check_in"
  | "visits.create"
  | "triage.view"
  | "triage.record"
  | "consultations.view"
  | "consultations.create"
  | "billing.view"
  | "billing.create"
  | "billing.receive_payment"
  | "pharmacy.view"
  | "pharmacy.prescribe"
  | "pharmacy.dispense"
  | "pharmacy.manage_inventory"
  | "laboratory.view"
  | "laboratory.create_order"
  | "laboratory.update_order"
  | "staff.manage"
  | "settings.manage";

const allRoles: UserRole[] = [
  "super_admin",
  "hospital_admin",
  "medical_director",
  "doctor",
  "nurse",
  "pharmacist",
  "lab_scientist",
  "receptionist",
  "cashier",
  "records_officer",
];

const actionRoles: Record<AppAction, UserRole[]> = {
  "patients.view": ["super_admin", "hospital_admin", "medical_director", "doctor", "nurse", "receptionist", "records_officer"],
  "patients.create": ["super_admin", "hospital_admin", "receptionist", "records_officer"],
  "appointments.view": ["super_admin", "hospital_admin", "medical_director", "doctor", "nurse", "receptionist"],
  "appointments.create": ["super_admin", "hospital_admin", "medical_director", "doctor", "nurse", "receptionist"],
  "appointments.check_in": ["super_admin", "hospital_admin", "receptionist", "nurse"],
  "visits.create": ["super_admin", "hospital_admin", "medical_director", "doctor", "nurse", "receptionist"],
  "triage.view": ["super_admin", "hospital_admin", "medical_director", "doctor", "nurse"],
  "triage.record": ["super_admin", "hospital_admin", "medical_director", "doctor", "nurse"],
  "consultations.view": ["super_admin", "hospital_admin", "medical_director", "doctor"],
  "consultations.create": ["super_admin", "hospital_admin", "medical_director", "doctor"],
  "billing.view": ["super_admin", "hospital_admin", "cashier", "receptionist"],
  "billing.create": ["super_admin", "hospital_admin", "cashier", "receptionist"],
  "billing.receive_payment": ["super_admin", "hospital_admin", "cashier"],
  "pharmacy.view": ["super_admin", "hospital_admin", "medical_director", "doctor", "pharmacist"],
  "pharmacy.prescribe": ["super_admin", "hospital_admin", "medical_director", "doctor"],
  "pharmacy.dispense": ["super_admin", "hospital_admin", "pharmacist"],
  "pharmacy.manage_inventory": ["super_admin", "hospital_admin", "pharmacist"],
  "laboratory.view": ["super_admin", "hospital_admin", "medical_director", "doctor", "lab_scientist"],
  "laboratory.create_order": ["super_admin", "hospital_admin", "medical_director", "doctor", "lab_scientist"],
  "laboratory.update_order": ["super_admin", "hospital_admin", "lab_scientist"],
  "staff.manage": ["super_admin", "hospital_admin"],
  "settings.manage": ["super_admin", "hospital_admin"],
};

export function canPerformAction(role: UserRole | null | undefined, action: AppAction) {
  if (!role) return false;
  return actionRoles[action]?.includes(role) ?? false;
}

export function isAnyKnownRole(role: UserRole | null | undefined) {
  return !!role && allRoles.includes(role);
}
