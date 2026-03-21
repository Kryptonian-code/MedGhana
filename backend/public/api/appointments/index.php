<?php
declare(strict_types=1);

require_once dirname(__DIR__, 4) . '/bootstrap.php';

$user = require_auth($pdo);
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

if ($method === 'GET') {
    [$scopeSql, $params] = scoped_where_clause($user, 'a.hospital_id', 'a.branch_id');
    $statement = $pdo->prepare(
        'SELECT
            a.id,
            a.patient_id,
            a.reference_code,
            a.doctor_name,
            a.department_name,
            a.appointment_date,
            a.appointment_time,
            a.status,
            a.type,
            a.queue_number,
            a.notes,
            a.sms_booking_sent,
            a.sms_booking_sent_at,
            a.sms_booking_status,
            a.sms_booking_error,
            a.sms_reminder_sent,
            a.sms_reminder_due_at,
            a.sms_reminder_sent_at,
            a.sms_reminder_status,
            a.sms_reminder_error,
            a.bulkclix_campaign_id,
            a.created_at,
            CONCAT(p.first_name, " ", p.last_name) AS patient_name,
            p.hospital_number
         FROM appointments a
         INNER JOIN patients p ON p.id = a.patient_id
         ' . $scopeSql . '
         ORDER BY a.appointment_date DESC, a.appointment_time DESC'
    );
    $statement->execute($params);
    json_response(['appointments' => $statement->fetchAll()]);
}

if ($method === 'POST') {
    require_roles($user, ['super_admin', 'hospital_admin', 'medical_director', 'doctor', 'receptionist', 'nurse']);

    $payload = request_body();
    $patientId = (int) ($payload['patient_id'] ?? 0);
    $doctorName = trim((string) ($payload['doctor_name'] ?? ''));
    $departmentName = trim((string) ($payload['department_name'] ?? ''));
    $appointmentDate = trim((string) ($payload['appointment_date'] ?? ''));
    $appointmentTime = trim((string) ($payload['appointment_time'] ?? ''));
    $type = trim((string) ($payload['type'] ?? 'new_visit'));
    $notes = trim((string) ($payload['notes'] ?? ''));

    if ($patientId <= 0 || $doctorName === '' || $departmentName === '' || $appointmentDate === '' || $appointmentTime === '') {
        json_response(['message' => 'Patient, doctor, department, date, and time are required.'], 422);
    }

    $queueStatement = $pdo->prepare(
        'SELECT COALESCE(MAX(queue_number), 0) + 1
         FROM appointments
         WHERE hospital_id = :hospital_id AND appointment_date = :appointment_date'
    );
    $queueStatement->execute([
        'hospital_id' => $user['hospital_id'],
        'appointment_date' => $appointmentDate,
    ]);
    $queueNumber = (int) $queueStatement->fetchColumn();

    $patientStatement = $pdo->prepare(
        'SELECT id, first_name, last_name, hospital_number, phone FROM patients WHERE id = :id AND hospital_id = :hospital_id LIMIT 1'
    );
    $patientStatement->execute([
        'id' => $patientId,
        'hospital_id' => $user['hospital_id'],
    ]);
    $patient = $patientStatement->fetch();

    if (!$patient) {
        json_response(['message' => 'Patient not found.'], 404);
    }

    $insert = $pdo->prepare(
        'INSERT INTO appointments (
            hospital_id, branch_id, patient_id, doctor_name, department_name, appointment_date, appointment_time, status, type, queue_number, notes, sms_reminder_due_at, created_by
         ) VALUES (
            :hospital_id, :branch_id, :patient_id, :doctor_name, :department_name, :appointment_date, :appointment_time, "scheduled", :type, :queue_number, :notes, :sms_reminder_due_at, :created_by
         )'
    );
    $insert->execute([
        'hospital_id' => $user['hospital_id'],
        'branch_id' => $user['branch_id'] ?: null,
        'patient_id' => $patientId,
        'doctor_name' => $doctorName,
        'department_name' => $departmentName,
        'appointment_date' => $appointmentDate,
        'appointment_time' => $appointmentTime,
        'type' => $type,
        'queue_number' => $queueNumber,
        'notes' => $notes !== '' ? $notes : null,
        'sms_reminder_due_at' => calculate_reminder_due_at($appointmentDate, $appointmentTime),
        'created_by' => $user['id'],
    ]);
    $appointmentId = (int) $pdo->lastInsertId();
    $referenceCode = generate_appointment_reference($appointmentId, $appointmentDate);

    $pdo->prepare(
        'UPDATE appointments
         SET reference_code = :reference_code
         WHERE id = :id'
    )->execute([
        'reference_code' => $referenceCode,
        'id' => $appointmentId,
    ]);

    $smsResult = null;

    $appointmentForSms = [
        'id' => $appointmentId,
        'hospital_id' => $user['hospital_id'],
        'branch_id' => $user['branch_id'] ?: null,
        'patient_id' => $patientId,
        'patient_name' => trim(($patient['first_name'] ?? '') . ' ' . ($patient['last_name'] ?? '')),
        'phone' => $patient['phone'] ?? '',
        'reference_code' => $referenceCode,
        'doctor_name' => $doctorName,
        'department_name' => $departmentName,
        'appointment_date' => $appointmentDate,
        'appointment_time' => $appointmentTime,
    ];

    try {
        $smsResult = send_appointment_sms($pdo, $appConfig, $appointmentForSms, 'booking');
    } catch (Throwable $exception) {
        error_log(sprintf('[MedGhana SMS] Appointment %d booking send crashed: %s', $appointmentId, $exception->getMessage()));
        $smsResult = [
            'success' => false,
            'error' => $exception->getMessage(),
        ];
        update_appointment_sms_status($pdo, $appointmentId, 'booking', $smsResult);
    }

    $smsBookingStatus = 'pending';
    if (is_array($smsResult)) {
        if (!empty($smsResult['success'])) {
            $smsBookingStatus = 'sent';
        } elseif (!empty($smsResult['skipped'])) {
            $smsBookingStatus = 'skipped';
        } else {
            $smsBookingStatus = 'failed';
        }
    }

    record_audit_log($pdo, $user, 'appointment_created', 'appointment', $appointmentId, [
        'patient_id' => $patientId,
        'appointment_date' => $appointmentDate,
        'appointment_time' => $appointmentTime,
        'doctor_name' => $doctorName,
        'department_name' => $departmentName,
        'reference_code' => $referenceCode,
    ]);

    json_response([
        'message' => 'Appointment booked successfully.',
        'appointment_id' => $appointmentId,
        'reference_code' => $referenceCode,
        'sms_booking_status' => $smsBookingStatus,
        'sms_booking_error' => $smsResult['error'] ?? null,
    ], 201);
}

json_response(['message' => 'Method not allowed.'], 405);
