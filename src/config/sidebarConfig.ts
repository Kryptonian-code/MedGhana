import type { ComponentType } from "react";
import {
  Activity,
  Baby,
  BarChart3,
  BedDouble,
  Crown,
  CalendarDays,
  CreditCard,
  FileText,
  FlaskConical,
  LayoutDashboard,
  Package,
  Pill,
  Settings,
  Shield,
  Stethoscope,
  UserCircle,
  UserCog,
  Users,
} from "lucide-react";
import type { UserRole } from "@/types";
import DashboardPage from "@/pages/DashboardPage";
import OwnerDashboardPage from "@/pages/OwnerDashboardPage";
import PatientsPage from "@/pages/PatientsPage";
import AppointmentsPage from "@/pages/AppointmentsPage";
import TriagePage from "@/pages/TriagePage";
import ConsultationsPage from "@/pages/ConsultationsPage";
import MedicalRecordsPage from "@/pages/MedicalRecordsPage";
import BillingPage from "@/pages/BillingPage";
import InsurancePage from "@/pages/InsurancePage";
import PharmacyPage from "@/pages/PharmacyPage";
import LaboratoryPage from "@/pages/LaboratoryPage";
import AdmissionsPage from "@/pages/AdmissionsPage";
import MaternityPage from "@/pages/MaternityPage";
import InventoryPage from "@/pages/InventoryPage";
import ReportsPage from "@/pages/ReportsPage";
import StaffPage from "@/pages/StaffPage";
import SettingsPage from "@/pages/SettingsPage";
import ProfilePage from "@/pages/ProfilePage";

export interface SidebarItem {
  title: string;
  path: string;
  icon: React.ElementType;
  roles?: UserRole[];
}

export interface ProtectedAppRoute extends SidebarItem {
  component: ComponentType;
}

export const protectedAppRoutes: ProtectedAppRoute[] = [
  {
    title: "Owner Dashboard",
    path: "/owner/dashboard",
    icon: Crown,
    roles: ["super_admin"],
    component: OwnerDashboardPage,
  },
  {
    title: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    roles: ["super_admin", "hospital_admin", "medical_director", "doctor", "nurse", "pharmacist", "lab_scientist", "receptionist", "cashier", "records_officer"],
    component: DashboardPage,
  },
  {
    title: "Patients",
    path: "/patients",
    icon: Users,
    roles: ["super_admin", "hospital_admin", "medical_director", "doctor", "nurse", "receptionist", "records_officer"],
    component: PatientsPage,
  },
  {
    title: "Appointments",
    path: "/appointments",
    icon: CalendarDays,
    roles: ["super_admin", "hospital_admin", "medical_director", "doctor", "nurse", "receptionist"],
    component: AppointmentsPage,
  },
  {
    title: "Triage",
    path: "/triage",
    icon: Activity,
    roles: ["super_admin", "hospital_admin", "medical_director", "doctor", "nurse"],
    component: TriagePage,
  },
  {
    title: "Consultations",
    path: "/consultations",
    icon: Stethoscope,
    roles: ["super_admin", "hospital_admin", "medical_director", "doctor"],
    component: ConsultationsPage,
  },
  {
    title: "Medical Records",
    path: "/medical-records",
    icon: FileText,
    roles: ["super_admin", "hospital_admin", "medical_director", "doctor", "nurse", "records_officer"],
    component: MedicalRecordsPage,
  },
  {
    title: "Billing",
    path: "/billing",
    icon: CreditCard,
    roles: ["super_admin", "hospital_admin", "cashier", "receptionist"],
    component: BillingPage,
  },
  {
    title: "NHIS / Insurance",
    path: "/insurance",
    icon: Shield,
    roles: ["super_admin", "hospital_admin", "cashier", "receptionist", "records_officer"],
    component: InsurancePage,
  },
  {
    title: "Pharmacy",
    path: "/pharmacy",
    icon: Pill,
    roles: ["super_admin", "hospital_admin", "medical_director", "doctor", "pharmacist"],
    component: PharmacyPage,
  },
  {
    title: "Laboratory",
    path: "/laboratory",
    icon: FlaskConical,
    roles: ["super_admin", "hospital_admin", "medical_director", "doctor", "lab_scientist"],
    component: LaboratoryPage,
  },
  {
    title: "Admissions",
    path: "/admissions",
    icon: BedDouble,
    roles: ["super_admin", "hospital_admin", "medical_director", "doctor", "nurse", "receptionist"],
    component: AdmissionsPage,
  },
  {
    title: "Maternity",
    path: "/maternity",
    icon: Baby,
    roles: ["super_admin", "hospital_admin", "medical_director", "doctor", "nurse"],
    component: MaternityPage,
  },
  {
    title: "Inventory",
    path: "/inventory",
    icon: Package,
    roles: ["super_admin", "hospital_admin", "pharmacist"],
    component: InventoryPage,
  },
  {
    title: "Reports",
    path: "/reports",
    icon: BarChart3,
    roles: ["super_admin", "hospital_admin", "medical_director"],
    component: ReportsPage,
  },
  {
    title: "Staff & Roles",
    path: "/staff",
    icon: UserCog,
    roles: ["super_admin", "hospital_admin"],
    component: StaffPage,
  },
  {
    title: "Settings",
    path: "/settings",
    icon: Settings,
    roles: ["super_admin", "hospital_admin"],
    component: SettingsPage,
  },
  {
    title: "Profile",
    path: "/profile",
    icon: UserCircle,
    roles: ["super_admin", "hospital_admin", "medical_director", "doctor", "nurse", "pharmacist", "lab_scientist", "receptionist", "cashier", "records_officer"],
    component: ProfilePage,
  },
];

export const sidebarItems: SidebarItem[] = protectedAppRoutes.map(({ title, path, icon, roles }) => ({
  title,
  path,
  icon,
  roles,
}));
