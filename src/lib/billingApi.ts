import { apiRequest } from "@/lib/api";
import type { Invoice, InvoiceItem } from "@/types";

export interface InvoicePayload {
  patient_id: number;
  visit_id?: number | null;
  payment_method?: string;
  paid_amount?: number;
  notes?: string;
  items: Array<Pick<InvoiceItem, "description" | "quantity" | "unit_price" | "category">>;
}

export interface BillableConsultation {
  id: string;
  visit_id: string;
  patient_id: string;
  diagnosis: string;
  treatment_plan?: string | null;
  created_at: string;
  patient_name: string;
  hospital_number: string;
}

export function listInvoices() {
  return apiRequest<{ invoices: Invoice[]; billable_consultations: BillableConsultation[] }>("/billing/index.php");
}

export function createInvoice(payload: InvoicePayload) {
  return apiRequest<{ message: string }>("/billing/index.php", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function recordInvoicePayment(id: string | number, amount: number, payment_method: string) {
  return apiRequest<{ message: string }>("/billing/payment.php", {
    method: "POST",
    body: JSON.stringify({ id, amount, payment_method }),
  });
}
