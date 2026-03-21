# MedGhana HMS

MedGhana HMS is a multi-tenant hospital management system and electronic medical records platform built for hospitals, clinics, maternity homes, and diagnostic centres. It brings registration, appointments, triage, consultations, billing, NHIS and insurance, pharmacy, laboratory, admissions, staff roles, and owner-level oversight into one coordinated web application.

## Overview

MedGhana is designed to solve a practical problem: many healthcare facilities still run critical workflows across notebooks, spreadsheets, phone calls, and disconnected tools. This project brings those moving parts into one product with:

- tenant-aware hospital workspaces
- role-based access across medical and administrative teams
- workflow handoffs between reception, triage, doctors, pharmacy, lab, billing, and records
- local deployment support for PHP, MySQL, Apache, and XAMPP
- Ghana-friendly operational details such as NHIS flows, GHS billing, Ghana region selection, and local phone handling

## Key Features

- Public landing page, hospital signup, staff login, and owner login
- Multi-tenant hospital and branch structure
- Owner dashboard with global operational visibility
- Patient registration with duplicate detection
- Patient detail view with appointments, visits, and invoices
- Appointment booking with queued SMS confirmation support
- Walk-in visit creation
- Triage workflow and vitals capture
- Consultation workflow with diagnosis, treatment plan, prescriptions, and lab requests in one save
- Billing with reusable completed consultations to avoid double entry
- NHIS and insurance claims with invoice reuse
- Pharmacy queue, dispensing workflow, and drug inventory
- Laboratory queue, result lifecycle, and doctor handoff
- Admissions and ward bed assignment
- Staff creation, role management, settings, and profile updates
- Internal notifications and audit logging

## Role Model

MedGhana currently includes policy-aware route and action controls for:

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

These restrictions are enforced in navigation, route access, and major workflow actions such as patient registration, walk-in creation, appointment check-in, triage capture, consultation completion, prescription handling, lab updates, invoice creation, and payment collection.

## Workflow Highlights

The current build is focused on reducing repeated work:

- Appointments can be checked in directly into the triage queue.
- Walk-in patients can be created without first creating an appointment.
- Consultations can create prescriptions and lab orders in one action.
- Billing can start from completed consultations instead of retyping patient and visit context.
- Insurance claims can reuse invoice and NHIS information.
- Duplicate patient creation is blocked with a warning instead of silently creating another chart.

## Tech Stack

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
- MySQL / MariaDB
- Apache / XAMPP
- Session-based authentication

## Repository Structure

```text
.
|-- backend/                PHP API, schema, workflow helpers, XAMPP notes
|-- public/                 Static assets
|-- src/                    React application, pages, components, stores, API clients
|-- README.md               Main project guide
|-- package.json            Frontend scripts and dependencies
`-- .env.example            Example frontend environment config
```

## Local Setup

### 1. Install frontend dependencies

```bash
npm install
```

### 2. Configure frontend environment

Create a local `.env` file:

```bash
VITE_API_BASE_URL="http://localhost/hms/backend/public/api"
VITE_APP_URL="http://127.0.0.1:8080"
```

If your Apache route is different, update `VITE_API_BASE_URL` to match it.

### 3. Configure backend

Backend setup is documented in [`backend/README.md`](/c:/Users/bigjo/Desktop/apps/MANAGEMENT%20SYSTEMS/hms/backend/README.md), but the short version is:

1. Make the project available to Apache through `htdocs` or a virtual host.
2. Import [`backend/database/schema.sql`](/c:/Users/bigjo/Desktop/apps/MANAGEMENT%20SYSTEMS/hms/backend/database/schema.sql) into MySQL.
3. Ensure Apache and MySQL are running in XAMPP.
4. Open `/create-hospital` to create the first hospital tenant and admin account.

### 4. Run the frontend

```bash
npm run dev
```

### 5. Verify the frontend

```bash
npm test
npm run build
```

## Backend Notes

- The project now uses a PHP/MySQL backend path instead of Supabase.
- Demo seed data has been removed so new environments start clean.
- The owner bootstrap account is provisioned automatically with the requested owner credentials and a hashed password.
- SMS support is queue-based, so a provider can be connected without changing the main workflow design.
- Local SMS verification can be done with `HMS_SMS_PROVIDER=log` and the queue processor script.

## Screenshots

This section is ready for GitHub screenshots when you have them.

Suggested captures:

- landing page
- login page
- owner dashboard
- patient registration
- consultation flow
- billing screen
- pharmacy queue
- laboratory queue

You can later add them under something like `docs/screenshots/` and reference them here.

## Release Checklist

- Confirm `.env` is not committed and secrets remain local
- Ensure Apache and MySQL are running locally
- Import the latest schema into the target database
- Verify `VITE_API_BASE_URL` points to the live backend route
- Run `npm test`
- Run `npm run build`
- Check hospital signup, login, and owner login
- Check patient registration and duplicate-patient warning
- Check walk-in creation and triage handoff
- Check consultation save with prescription and lab order creation
- Check billing reuse from completed consultations
- Check insurance claim reuse from invoices
- Check pharmacy dispense flow
- Check lab result completion flow
- Check notifications and audit trail visibility

## Current Status

This project is no longer using Supabase as its active backend path. The current direction is a local PHP/MySQL implementation under XAMPP/Apache, with tenant-aware authentication, owner oversight, patient registration, patient detail views, appointment booking, triage capture, consultation handoffs, internal workflow notifications, queued appointment SMS confirmations, billing workflows, pharmacy queues, and laboratory queues forming the first production slice.

## Next Build Priorities

