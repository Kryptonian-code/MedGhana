import { apiRequest } from "@/lib/api";

export interface InsuranceClaim {
  id: string;
  patient_id: string;
  invoice_id?: string | null;
  nhis_number?: string | null;
  service_description: string;
  amount: number;
  status: "draft" | "submitted" | "approved" | "pending" | "rejected";
  claim_date: string;
  notes?: string | null;
  patient_name?: string;
}

export interface ClaimableInvoice {
  id: string;
  patient_id: string;
  invoice_number: string;
  total_amount: number;
  balance: number;
  status: string;
  created_at: string;
  nhis_number?: string | null;
  patient_name?: string;
}

export interface ClaimPayload {
  patient_id: number;
  invoice_id?: number | null;
  nhis_number?: string;
  service_description: string;
  amount: number;
  claim_date: string;
  notes?: string;
}

export function listClaims() {
  return apiRequest<{ claims: InsuranceClaim[]; claimable_invoices: ClaimableInvoice[] }>("/insurance/index.php");
}

export function createClaim(payload: ClaimPayload) {
  return apiRequest<{ message: string }>("/insurance/index.php", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateClaimStatus(id: string | number, status: "approved" | "pending" | "rejected") {
  return apiRequest<{ message: string }>("/insurance/status.php", {
    method: "POST",
    body: JSON.stringify({ id, status }),
  });
}
