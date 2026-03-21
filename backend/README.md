# HMS Backend

This backend is built for a local XAMPP/Apache + MySQL setup and serves as the foundation for MedGhana HMS. It is designed for multi-tenant hospital operations, local deployment, and role-aware access across clinical and administrative teams.

## Included in this slice

- Multi-tenant tables for hospitals, branches, users, patients, consultations, notifications, queued SMS, drugs, prescriptions, and lab orders
- Session-based staff login endpoint
- Owner login endpoint
- Hospital signup endpoint
- Current-session endpoint
- Logout endpoint
- Tenant-scoped patient, appointment, triage, consultation, billing, pharmacy, laboratory, dashboard, notification, and owner-overview endpoints

## Default local database settings

- Database: `hms`
- Host: `127.0.0.1`
- Port: `3306`
- User: `root`
- Password: empty by default

Override them with these environment variables if needed:

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

## Setup

1. Import `backend/database/schema.sql`.
2. Serve the `backend` folder through Apache.
3. Point the frontend `VITE_API_BASE_URL` to the `/backend/public/api` URL.
4. Use the `/create-hospital` page in the frontend to create your first tenant, branch, and admin account.

## Notes

- This backend no longer depends on Supabase.
- Demo seed data has been removed so new environments start clean.
- Authentication currently uses PHP sessions with email/password login for hospital staff, plus a dedicated owner login route for the platform owner account.
- The owner bootstrap account is provisioned automatically as username `Joseph` with a hashed password for the requested owner dashboard flow.
- Appointment booking now queues an SMS confirmation record in `sms_messages`; a live provider integration can be plugged in with the SMS environment variables.
- For local verification, set `HMS_SMS_PROVIDER=log` and run `php backend/scripts/process_sms_queue.php` to process queued SMS messages into the PHP error log.
- Workflow notifications are stored in `notifications` and are used for handoffs such as triage queue, doctor queue, pharmacy queue, laboratory queue, and billing/records follow-up.
