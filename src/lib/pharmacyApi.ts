import { apiRequest } from "@/lib/api";
import type { Drug, Prescription } from "@/types";

export interface PrescriptionPayload {
  patient_id: number;
  consultation_id?: number | null;
  drug_id?: number | null;
  drug_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions?: string;
}

export interface DrugPayload {
  name: string;
  generic_name?: string;
  category: string;
  dosage_form: string;
  strength?: string;
  unit_price: number;
  stock_quantity: number;
  reorder_level: number;
  expiry_date?: string;
  batch_number?: string;
  supplier?: string;
}

export function listPharmacyData() {
  return apiRequest<{ drugs: Drug[]; prescriptions: Prescription[] }>("/pharmacy/index.php");
}

export function createPrescription(payload: PrescriptionPayload) {
  return apiRequest<{ message: string }>("/pharmacy/index.php", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function createDrug(payload: DrugPayload) {
  return apiRequest<{ message: string }>("/pharmacy/drugs.php", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function dispensePrescription(id: string | number) {
  return apiRequest<{ message: string }>("/pharmacy/dispense.php", {
    method: "POST",
    body: JSON.stringify({ id }),
  });
}
