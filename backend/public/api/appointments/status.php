<?php
declare(strict_types=1);

require_once dirname(__DIR__, 4) . '/bootstrap.php';

request_method('POST');

$user = require_auth($pdo);
require_roles($user, ['super_admin', 'hospital_admin', 'medical_director', 'doctor', 'receptionist', 'nurse']);

$payload = request_body();
$appointmentId = (int) ($payload['id'] ?? 0);
$status = trim((string) ($payload['status'] ?? ''));

if ($appointmentId <= 0 || !in_array($status, ['checked_in', 'in_progress', 'completed', 'cancelled', 'no_show'], true)) {
    json_response(['message' => 'A valid appointment id and status are required.'], 422);
}

$appointmentStatement = $pdo->prepare(
    'SELECT * FROM appointments WHERE id = :id AND hospital_id = :hospital_id LIMIT 1'
);
$appointmentStatement->execute([
    'id' => $appointmentId,
    'hospital_id' => $user['hospital_id'],
]);
$appointment = $appointmentStatement->fetch();

if (!$appointment) {
    json_response(['message' => 'Appointment not found.'], 404);
}

$pdo->prepare(
    'UPDATE appointments SET status = :status, checked_in_at = CASE WHEN :status = "checked_in" THEN NOW() ELSE checked_in_at END, checked_in_by = CASE WHEN :status = "checked_in" THEN :user_id ELSE checked_in_by END WHERE id = :id'
)->execute([
    'status' => $status,
    'user_id' => $user['id'],
    'id' => $appointmentId,
]);

if ($status === 'checked_in') {
    $visitExists = $pdo->prepare('SELECT id FROM visits WHERE appointment_id = :appointment_id LIMIT 1');
    $visitExists->execute(['appointment_id' => $appointmentId]);

    if (!$visitExists->fetch()) {
        $pdo->prepare(
            'INSERT INTO visits (
                hospital_id, branch_id, patient_id, appointment_id, visit_date, visit_time, source, status, queue_number, complaint, checked_in_by
            ) VALUES (
                :hospital_id, :branch_id, :patient_id, :appointment_id, :visit_date, :visit_time, "appointment", "waiting_triage", :queue_number, :complaint, :checked_in_by
            )'
        )->execute([
            'hospital_id' => $appointment['hospital_id'],
            'branch_id' => $appointment['branch_id'],
            'patient_id' => $appointment['patient_id'],
            'appointment_id' => $appointmentId,
            'visit_date' => $appointment['appointment_date'],
            'visit_time' => $appointment['appointment_time'],
            'queue_number' => $appointment['queue_number'],
            'complaint' => $appointment['notes'],
            'checked_in_by' => $user['id'],
        ]);
    }

    $patientStatement = $pdo->prepare(
        'SELECT hospital_number, first_name, last_name FROM patients WHERE id = :id LIMIT 1'
    );
    $patientStatement->execute(['id' => $appointment['patient_id']]);
    $patient = $patientStatement->fetch();

    if ($patient) {
        $patientName = trim($patient['first_name'] . ' ' . $patient['last_name']);
        notify_roles($pdo, $user, ['nurse', 'medical_director'], [
            'patient_id' => $appointment['patient_id'],
            'type' => 'triage_queue',
            'title' => 'Patient ready for triage',
            'message' => sprintf(
                '%s (%s) has checked in and is waiting for triage.',
                $patientName,
                $patient['hospital_number']
            ),
            'link' => '/triage',
        ]);
    }
}

record_audit_log($pdo, $user, 'appointment_status_updated', 'appointment', $appointmentId, [
    'status' => $status,
    'patient_id' => (int) $appointment['patient_id'],
]);

json_response(['message' => 'Appointment status updated.']);
