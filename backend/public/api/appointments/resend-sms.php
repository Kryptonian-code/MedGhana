<?php
declare(strict_types=1);

require_once dirname(__DIR__, 4) . '/bootstrap.php';

request_method('POST');

$user = require_auth($pdo);
require_roles($user, ['super_admin', 'hospital_admin', 'medical_director', 'doctor', 'receptionist', 'nurse']);

$payload = request_body();
$appointmentId = (int) ($payload['id'] ?? 0);

if ($appointmentId <= 0) {
    json_response(['message' => 'A valid appointment id is required.'], 422);
}

try {
    $result = resend_appointment_booking_sms($pdo, $appConfig, $appointmentId, (int) $user['hospital_id']);
} catch (Throwable $exception) {
    error_log(sprintf('[MedGhana SMS] Manual resend crashed for appointment %d: %s', $appointmentId, $exception->getMessage()));
    json_response([
        'message' => 'Manual SMS resend failed.',
        'sms_status' => 'failed',
        'error' => $exception->getMessage(),
    ], 500);
}

record_audit_log($pdo, $user, 'appointment_booking_sms_resent', 'appointment', $appointmentId, [
    'success' => (bool) ($result['success'] ?? false),
    'error' => $result['error'] ?? null,
]);

json_response([
    'message' => !empty($result['success'])
        ? 'Booking SMS resent successfully.'
        : 'Booking SMS resend completed with issues.',
    'sms_status' => !empty($result['success']) ? 'sent' : (!empty($result['skipped']) ? 'skipped' : 'failed'),
    'error' => $result['error'] ?? null,
]);
