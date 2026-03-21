# MedGhana HMS

MedGhana HMS is a multi-tenant hospital management system and electronic medical records platform designed for hospitals, clinics, maternity homes, and diagnostic centres. It brings patient registration, appointments, triage, consultations, billing, insurance, pharmacy, laboratory, admissions, reporting, staff roles, and system administration into one coordinated web application.

## Why This Project Exists

Many healthcare facilities still split their workflow across notebooks, spreadsheets, WhatsApp messages, and disconnected software. MedGhana aims to replace that fragmentation with one system that is:

- multi-tenant, so each hospital has its own isolated workspace
- role-aware, so doctors, pharmacists, nurses, receptionists, and finance teams only see what they should
- ready for local deployment on XAMPP/Apache and MySQL
- practical for Ghanaian and broader African healthcare operations

## Current Architecture

Frontend:

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Zustand
- React Query
- Vitest
- Playwright

Backend:

- PHP
- MySQL
- Apache / XAMPP
- Session-based authentication

## Key Product Areas

- Public landing page
- Owner login via `/owner/login`
- Owner dashboard via `/owner/dashboard`
- Hospital onboarding via `/create-hospital`
- Secure login via `/login`
- Tenant-aware dashboard
- Patients
- Appointments
- Triage
- Consultations
- Medical records
- Billing
- NHIS / Insurance
- Pharmacy
- Laboratory
- Admissions
- Maternity
- Inventory
- Reports
- Staff and role management
- Settings and profile management

## Role Policy Model

The app now includes route-aware role restrictions for:

- `super_admin`
- `hospital_admin`
- `medical_director`
- `doctor`
- `nurse`
- `pharmacist`
- `lab_scientist`
- `receptionist`
- `cashier`
- `records_officer`

These restrictions are applied in navigation, at the route level, and now within key module actions such as patient registration, appointment booking/check-in, triage capture, consultation capture, prescription handling, lab-order updates, invoice creation, and payment collection.

## Local Development

1. Install frontend dependencies:

```bash
npm install
```

2. Create or update your local env:

```bash
VITE_API_BASE_URL="http://localhost/hms/backend/public/api"
VITE_APP_URL="http://127.0.0.1:8080"
```

3. Start the frontend:

```bash
npm run dev
```

4. Build the frontend:

```bash
npm run build
```

5. Run the frontend tests:

```bash
npm run test
```

## Backend Setup

Backend setup instructions live in [`backend/README.md`](/c:/Users/bigjo/Desktop/apps/MANAGEMENT%20SYSTEMS/hms/backend/README.md).

## Current Status

This project is no longer using Supabase as its active backend path. The current direction is a local PHP/MySQL implementation under XAMPP/Apache, with tenant-aware authentication, owner oversight, patient registration, patient detail views, appointment booking, triage capture, consultation handoffs, internal workflow notifications, queued appointment SMS confirmations, billing workflows, pharmacy queues, and laboratory queues forming the first production slice.

## Next Build Priorities

- claims and insurance processing
- admissions workflow and bed assignment actions
- staff creation and editable role management
- persistent profile/settings APIs
- deeper audit logging and branch policy enforcement
