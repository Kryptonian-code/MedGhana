# MedGhana Backend

This backend is the PHP/MySQL workflow engine behind MedGhana HMS. It is designed for XAMPP and Apache, multi-tenant hospital operations, role-aware access control, and coordinated clinical and administrative handoffs.

## What It Covers

- hospitals, branches, users, and sessions
- patient registration and patient detail retrieval
- appointments and appointment check-in
- walk-in visit creation
- triage recording
- consultations with prescription and lab-order creation
- billing and invoice payments
- NHIS and insurance claims
- pharmacy and laboratory queues
- admissions and wards
- notifications, SMS queueing, and audit logs
- owner dashboard visibility

## Default Database Settings

- Database: `hms`
- Host: `127.0.0.1`
- Port: `3306`
- User: `root`
- Password: empty by default

Override them with:

- `HMS_DB_HOST`
- `HMS_DB_PORT`
- `HMS_DB_NAME`
- `HMS_DB_USER`
- `HMS_DB_PASSWORD`
- `HMS_FRONTEND_ORIGINS`
- `HMS_SMS_ENABLED`
- `HMS_SMS_PROVIDER`
- `HMS_SMS_SENDER_ID`
- `HMS_SMS_API_URL`
- `BULKCLIX_API_KEY`
- `BULKCLIX_SENDER_ID`

## Setup

1. Make the project reachable through Apache, either under `htdocs` or via a virtual host.
2. Import [`backend/database/schema.sql`](/c:/Users/bigjo/Desktop/apps/MANAGEMENT%20SYSTEMS/hms/backend/database/schema.sql) into MySQL.
3. Ensure the frontend `VITE_API_BASE_URL` points to your Apache-served `/backend/public/api` path.
4. Start Apache and MySQL in XAMPP.
5. Open the frontend and use `/create-hospital` to create the first hospital tenant and admin user.

## SMS Support

Appointment booking now attempts SMS delivery immediately after save and logs every attempt in `sms_messages`.
Appointments also track booking/reminder SMS status directly for admin review.

For simple local verification:

```bash
set HMS_SMS_PROVIDER=log
C:\xampp\php\php.exe backend\scripts\process_sms_queue.php
C:\xampp\php\php.exe backend\scripts\process_appointment_reminders.php
```

That writes SMS output into the PHP error log instead of sending to a live provider.

For BulkClix:

```bash
set HMS_SMS_ENABLED=true
set HMS_SMS_PROVIDER=bulkclix
set BULKCLIX_API_KEY=replace_with_real_key
set BULKCLIX_SENDER_ID=replace_with_sender_id
```

Before using the new SMS workflow on an existing database, run:

```bash
mysql -u root hms < backend/database/migrations/20260321_add_appointment_sms_notifications.sql
```

## Important Notes

- Supabase is no longer part of the active backend path.
- Demo seed data has been removed so environments start clean.
- Authentication uses PHP sessions.
- The owner bootstrap account is provisioned automatically with the requested owner credentials and a hashed password.
- Workflow notifications are stored in `notifications`.
- Audit records are stored in `audit_logs`.

## Recommended Local Verification

- create hospital
- log in as hospital staff
- register a patient
- confirm duplicate patient detection works
- book appointment and check in
- create a walk-in visit
- record triage
- complete consultation with prescription and lab order
- reuse consultation data in billing
- reuse invoice data in insurance
- dispense prescription
- complete lab result
- review owner audit trail
