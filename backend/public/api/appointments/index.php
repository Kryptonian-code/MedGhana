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
            a.doctor_name,
            a.appointment_date,
            a.appointment_time,
            a.status,
            a.type,
            a.queue_number,
            a.notes,
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
    $appointmentDate = trim((string) ($payload['appointment_date'] ?? ''));
    $appointmentTime = trim((string) ($payload['appointment_time'] ?? ''));
    $type = trim((string) ($payload['type'] ?? 'new_visit'));
    $notes = trim((string) ($payload['notes'] ?? ''));

    if ($patientId <= 0 || $doctorName === '' || $appointmentDate === '' || $appointmentTime === '') {
        json_response(['message' => 'Patient, doctor, date, and time are required.'], 422);
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

    $insert = $pdo->prepare(
        'INSERT INTO appointments (
            hospital_id, branch_id, patient_id, doctor_name, appointment_date, appointment_time, status, type, queue_number, notes, created_by
         ) VALUES (
            :hospital_id, :branch_id, :patient_id, :doctor_name, :appointment_date, :appointment_time, "scheduled", :type, :queue_number, :notes, :created_by
         )'
    );
    $insert->execute([
        'hospital_id' => $user['hospital_id'],
        'branch_id' => $user['branch_id'] ?: null,
        'patient_id' => $patientId,
        'doctor_name' => $doctorName,
        'appointment_date' => $appointmentDate,
        'appointment_time' => $appointmentTime,
        'type' => $type,
        'queue_number' => $queueNumber,
        'notes' => $notes !== '' ? $notes : null,
        'created_by' => $user['id'],
    ]);
    $appointmentId = (int) $pdo->lastInsertId();

    $patientStatement = $pdo->prepare(
        'SELECT id, first_name, last_name, hospital_number, phone FROM patients WHERE id = :id AND hospital_id = :hospital_id LIMIT 1'
    );
    $patientStatement->execute([
        'id' => $patientId,
        'hospital_id' => $user['hospital_id'],
    ]);
    $patient = $patientStatement->fetch();

    if ($patient && !empty($patient['phone'])) {
        queue_appointment_confirmation_sms($pdo, $user, $patient, [
            'appointment_date' => $appointmentDate,
            'appointment_time' => $appointmentTime,
            'doctor_name' => $doctorName,
        ]);
    }

    record_audit_log($pdo, $user, 'appointment_created', 'appointment', $appointmentId, [
        'patient_id' => $patientId,
        'appointment_date' => $appointmentDate,
        'appointment_time' => $appointmentTime,
        'doctor_name' => $doctorName,
    ]);

    json_response(['message' => 'Appointment booked successfully.'], 201);
}

json_response(['message' => 'Method not allowed.'], 405);
