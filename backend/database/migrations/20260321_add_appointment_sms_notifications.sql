ALTER TABLE appointments
  ADD COLUMN reference_code VARCHAR(60) DEFAULT NULL AFTER patient_id,
  ADD COLUMN department_name VARCHAR(150) DEFAULT NULL AFTER doctor_name,
  ADD COLUMN sms_booking_sent TINYINT(1) NOT NULL DEFAULT 0 AFTER notes,
  ADD COLUMN sms_booking_sent_at DATETIME DEFAULT NULL AFTER sms_booking_sent,
  ADD COLUMN sms_booking_status ENUM('pending', 'sent', 'failed', 'skipped') NOT NULL DEFAULT 'pending' AFTER sms_booking_sent_at,
  ADD COLUMN sms_booking_error TEXT DEFAULT NULL AFTER sms_booking_status,
  ADD COLUMN sms_reminder_sent TINYINT(1) NOT NULL DEFAULT 0 AFTER sms_booking_error,
  ADD COLUMN sms_reminder_due_at DATETIME DEFAULT NULL AFTER sms_reminder_sent,
  ADD COLUMN sms_reminder_sent_at DATETIME DEFAULT NULL AFTER sms_reminder_due_at,
  ADD COLUMN sms_reminder_status ENUM('pending', 'sent', 'failed', 'skipped') NOT NULL DEFAULT 'pending' AFTER sms_reminder_sent_at,
  ADD COLUMN sms_reminder_error TEXT DEFAULT NULL AFTER sms_reminder_status,
  ADD COLUMN bulkclix_campaign_id VARCHAR(120) DEFAULT NULL AFTER sms_reminder_error;

ALTER TABLE sms_messages
  ADD COLUMN appointment_id BIGINT UNSIGNED DEFAULT NULL AFTER patient_id,
  ADD COLUMN notification_type ENUM('general', 'booking', 'reminder', 'manual_resend') NOT NULL DEFAULT 'general' AFTER context,
  ADD CONSTRAINT fk_sms_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL;

UPDATE appointments
SET reference_code = CONCAT('APT-', DATE_FORMAT(created_at, '%Y%m%d'), '-', LPAD(id, 6, '0'))
WHERE reference_code IS NULL;

UPDATE appointments
SET sms_reminder_due_at = DATE_SUB(TIMESTAMP(appointment_date, appointment_time), INTERVAL 24 HOUR)
WHERE sms_reminder_due_at IS NULL;
