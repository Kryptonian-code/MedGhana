import { apiRequest } from "@/lib/api";
import type { LabOrder } from "@/types";

export interface LabOrderPayload {
  patient_id: number;
  test_name: string;
  test_category: string;
  priority: "routine" | "urgent" | "stat";
  sample_type?: string;
  clinical_notes?: string;
}

export function listLabOrders() {
  return apiRequest<{ lab_orders: LabOrder[] }>("/laboratory/index.php");
}

export function createLabOrder(payload: LabOrderPayload) {
  return apiRequest<{ message: string }>("/laboratory/index.php", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateLabOrderStatus(id: string | number, status: string, results?: string, result_notes?: string) {
  return apiRequest<{ message: string }>("/laboratory/status.php", {
    method: "POST",
    body: JSON.stringify({ id, status, results, result_notes }),
  });
}
