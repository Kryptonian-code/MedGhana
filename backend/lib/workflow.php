<?php
declare(strict_types=1);

function create_notification(PDO $pdo, array $user, array $payload): void
{
    $statement = $pdo->prepare(
        'INSERT INTO notifications (
            hospital_id, branch_id, patient_id, user_id, role_target, type, title, message, link
        ) VALUES (
            :hospital_id, :branch_id, :patient_id, :user_id, :role_target, :type, :title, :message, :link
        )'
    );

    $statement->execute([
        'hospital_id' => $user['hospital_id'],
        'branch_id' => $user['branch_id'] ?: null,
        'patient_id' => $payload['patient_id'] ?? null,
        'user_id' => $payload['user_id'] ?? null,
        'role_target' => $payload['role_target'] ?? null,
        'type' => $payload['type'],
        'title' => $payload['title'],
        'message' => $payload['message'],
        'link' => $payload['link'] ?? null,
    ]);
}

function notify_roles(PDO $pdo, array $user, array $roles, array $payload): void
{
    foreach ($roles as $role) {
        create_notification($pdo, $user, array_merge($payload, ['role_target' => $role]));
    }
}

function queue_sms_message(PDO $pdo, array $user, array $payload): void
{
    $statement = $pdo->prepare(
        'INSERT INTO sms_messages (
            hospital_id, branch_id, patient_id, phone_number, message, context, provider, sender_id, status
        ) VALUES (
            :hospital_id, :branch_id, :patient_id, :phone_number, :message, :context, :provider, :sender_id, "queued"
        )'
    );

    $statement->execute([
        'hospital_id' => $user['hospital_id'],
        'branch_id' => $user['branch_id'] ?: null,
        'patient_id' => $payload['patient_id'] ?? null,
        'phone_number' => $payload['phone_number'],
        'message' => $payload['message'],
        'context' => $payload['context'] ?? 'general',
        'provider' => getenv('HMS_SMS_PROVIDER') ?: null,
        'sender_id' => getenv('HMS_SMS_SENDER_ID') ?: null,
    ]);
}

function queue_appointment_confirmation_sms(PDO $pdo, array $user, array $patient, array $appointment): void
{
    $patientName = trim(($patient['first_name'] ?? '') . ' ' . ($patient['last_name'] ?? ''));
    $hospitalName = $user['hospital_name'] ?? 'your hospital';
    $message = sprintf(
        'MedGhana: Dear %s, your appointment at %s is on %s at %s with %s. Ref: %s.',
        $patientName !== '' ? $patientName : 'Patient',
        $hospitalName,
        $appointment['appointment_date'],
        $appointment['appointment_time'],
        $appointment['doctor_name'],
        $patient['hospital_number'] ?? 'N/A'
    );

    queue_sms_message($pdo, $user, [
        'patient_id' => $patient['id'] ?? null,
        'phone_number' => $patient['phone'],
        'message' => $message,
        'context' => 'appointment_confirmation',
    ]);
}
