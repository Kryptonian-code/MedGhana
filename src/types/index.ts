export type UserRole =
  | 'super_admin'
  | 'hospital_admin'
  | 'medical_director'
  | 'doctor'
  | 'nurse'
  | 'pharmacist'
  | 'lab_scientist'
  | 'receptionist'
  | 'cashier'
  | 'records_officer';

export interface Hospital {
  id: string;
  name: string;
  code: string;
}

export interface Branch {
  id: string;
  hospital_id: string;
  name: string;
  code: string;
}

export interface User {
  id: string;
  username?: string | null;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  hospital_id?: string;
  branch_id?: string;
  phone?: string | null;
  status?: "active" | "inactive";
}

export interface AuthUser extends User {
  hospital_name?: string;
  hospital_code?: string;
  branch_name?: string | null;
  branch_code?: string | null;
}

export interface Patient {
  id: string;
  hospital_number: string;
  first_name: string;
  last_name: string;
  other_names?: string;
  gender: 'male' | 'female';
  date_of_birth: string;
  phone: string;
  email?: string;
  address?: string;
  town?: string;
  district?: string;
  region?: string;
  national_id_type?: string;
  national_id_number?: string;
  nhis_number?: string;
  nhis_expiry?: string;
  insurance_type?: 'nhis' | 'private' | 'none';
  blood_group?: string;
  genotype?: string;
  photo_url?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  next_of_kin_name?: string;
  next_of_kin_phone?: string;
  next_of_kin_relationship?: string;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id?: string;
  doctor_name?: string;
  appointment_date: string;
  appointment_time: string;
  status: 'scheduled' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  type: 'new_visit' | 'follow_up' | 'emergency' | 'referral';
  queue_number?: number;
  notes?: string;
  patient?: Patient;
  doctor?: User;
  patient_name?: string;
  hospital_number?: string;
  created_at: string;
}

export interface Visit {
  id: string;
  patient_id: string;
  appointment_id?: string | null;
  visit_date: string;
  visit_time: string;
  source: 'walk_in' | 'appointment';
  status: 'waiting_triage' | 'in_triage' | 'triaged' | 'in_consultation' | 'completed';
  queue_number?: number | null;
  complaint?: string | null;
  patient_name?: string;
  hospital_number?: string;
  temperature?: number | null;
  pulse?: number | null;
  respiratory_rate?: number | null;
  blood_pressure_systolic?: number | null;
  blood_pressure_diastolic?: number | null;
  oxygen_saturation?: number | null;
  weight?: number | null;
  height?: number | null;
  bmi?: number | null;
  triage_notes?: string | null;
}

export interface TriageRecord {
  id: string;
  patient_id: string;
  visit_id: string;
  temperature?: number;
  pulse?: number;
  respiratory_rate?: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  oxygen_saturation?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  notes?: string;
  recorded_by: string;
  created_at: string;
}

export interface Consultation {
  id: string;
  patient_id: string;
  visit_id: string;
  doctor_id?: string;
  doctor_name?: string;
  presenting_complaint: string;
  history_of_present_illness?: string;
  examination_findings?: string;
  diagnosis: string;
  icd_code?: string;
  treatment_plan?: string;
  notes?: string;
  status: 'in_progress' | 'completed';
  patient?: Patient;
  doctor?: User;
  patient_name?: string;
  hospital_number?: string;
  prescription_count?: number;
  lab_order_count?: number;
  created_at: string;
}

export interface Invoice {
  id: string;
  patient_id: string;
  invoice_number: string;
  total_amount: number;
  paid_amount: number;
  balance: number;
  status: 'pending' | 'partial' | 'paid' | 'cancelled';
  items: InvoiceItem[];
  patient?: Patient;
  patient_name?: string;
  payment_method?: string | null;
  created_at: string;
}

export interface PatientDetailResponse {
  patient: Patient;
  appointments: Appointment[];
  visits: Visit[];
  invoices: Invoice[];
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  category: 'consultation' | 'lab' | 'pharmacy' | 'procedure' | 'admission' | 'other';
}

export interface Drug {
  id: string;
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
  created_at?: string;
}

export interface Prescription {
  id: string;
  patient_id: string;
  doctor_id?: string;
  consultation_id?: string;
  drug_id?: string;
  drug_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions?: string;
  status: 'pending' | 'dispensed' | 'cancelled';
  dispensed_by?: string;
  dispensed_at?: string;
  patient_name?: string;
  doctor_name?: string;
  created_at?: string;
}

export interface LabOrder {
  id: string;
  patient_id: string;
  doctor_id?: string;
  consultation_id?: string | null;
  test_name: string;
  test_category: string;
  priority: 'routine' | 'urgent' | 'stat';
  status: 'ordered' | 'sample_collected' | 'processing' | 'completed' | 'cancelled';
  sample_type?: string;
  clinical_notes?: string;
  results?: string;
  result_notes?: string;
  approved_by?: string;
  patient_name?: string;
  doctor_name?: string;
  patient?: Patient;
  created_at: string;
}

export interface Ward {
  id: string;
  name: string;
  type: 'general' | 'private' | 'icu' | 'maternity' | 'pediatric' | 'emergency';
  total_beds: number;
  occupied_beds: number;
  available_beds: number;
}

export interface Admission {
  id: string;
  patient_id: string;
  ward_id: string;
  bed_number: string;
  admission_date: string;
  discharge_date?: string;
  reason: string;
  status: 'admitted' | 'discharged' | 'transferred';
  patient?: Patient;
  ward?: Ward;
}

export interface AntenatalRecord {
  id: string;
  patient_id: string;
  lmp?: string;
  edd?: string;
  gravida?: number;
  parity?: number;
  gestational_age_weeks?: number;
  blood_group?: string;
  hb_level?: number;
  hiv_status?: string;
  hepatitis_b?: string;
  notes?: string;
  patient?: Patient;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  reorder_level: number;
  unit_cost: number;
  supplier?: string;
  last_restocked?: string;
}

export interface DashboardStats {
  patients_today: number;
  appointments_today: number;
  waiting_triage?: number;
  ready_for_consultation?: number;
  pending_lab_tests: number;
  pharmacy_sales_today: number;
  revenue_today: number;
  bed_occupancy: number;
  total_patients: number;
  pending_bills: number;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  is_read: boolean | number;
  created_at: string;
}

export interface AuditEvent {
  id: string;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  created_at: string;
  full_name?: string | null;
  user_role?: string | null;
  hospital_name?: string | null;
}
