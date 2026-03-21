<?php
declare(strict_types=1);

require_once dirname(__DIR__, 4) . '/bootstrap.php';

$user = require_auth($pdo);
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

if ($method === 'POST') {
    require_roles($user, ['super_admin', 'hospital_admin', 'medical_director', 'doctor', 'nurse', 'receptionist']);

    $payload = request_body();
    $patientId = (int) ($payload['patient_id'] ?? 0);
    $visitDate = trim((string) ($payload['visit_date'] ?? ''));
    $visitTime = trim((string) ($payload['visit_time'] ?? ''));
    $complaint = trim((string) ($payload['complaint'] ?? ''));

    if ($patientId <= 0 || $visitDate === '' || $visitTime === '') {
        json_response(['message' => 'Patient, visit date, and visit time are required.'], 422);
    }

    $patientStatement = $pdo->prepare(
        'SELECT id, first_name, last_name, hospital_number
         FROM patients
         WHERE id = :id AND hospital_id = :hospital_id
         LIMIT 1'
    );
    $patientStatement->execute([
        'id' => $patientId,
        'hospital_id' => $user['hospital_id'],
    ]);
    $patient = $patientStatement->fetch();

    if (!$patient) {
        json_response(['message' => 'Patient not found.'], 404);
    }

    $queueStatement = $pdo->prepare(
        'SELECT COALESCE(MAX(queue_number), 0) + 1
         FROM visits
         WHERE hospital_id = :hospital_id AND visit_date = :visit_date'
    );
    $queueStatement->execute([
        'hospital_id' => $user['hospital_id'],
        'visit_date' => $visitDate,
    ]);
    $queueNumber = (int) $queueStatement->fetchColumn();

    $pdo->prepare(
        'INSERT INTO visits (
            hospital_id, branch_id, patient_id, visit_date, visit_time, source, status, queue_number, complaint, checked_in_by
        ) VALUES (
            :hospital_id, :branch_id, :patient_id, :visit_date, :visit_time, "walk_in", "waiting_triage", :queue_number, :complaint, :checked_in_by
        )'
    )->execute([
        'hospital_id' => $user['hospital_id'],
        'branch_id' => $user['branch_id'] ?: null,
        'patient_id' => $patientId,
        'visit_date' => $visitDate,
        'visit_time' => $visitTime,
        'queue_number' => $queueNumber,
        'complaint' => $complaint !== '' ? $complaint : null,
        'checked_in_by' => $user['id'],
    ]);

    $visitId = (int) $pdo->lastInsertId();

    notify_roles($pdo, $user, ['nurse', 'medical_director'], [
        'patient_id' => $patientId,
        'type' => 'triage_queue',
        'title' => 'Walk-in patient ready for triage',
        'message' => sprintf(
            '%s %s (%s) has been checked in as a walk-in and is waiting for triage.',
            $patient['first_name'],
            $patient['last_name'],
            $patient['hospital_number']
        ),
        'link' => '/triage',
    ]);

    record_audit_log($pdo, $user, 'walk_in_created', 'visit', $visitId, [
        'patient_id' => $patientId,
        'queue_number' => $queueNumber,
        'source' => 'walk_in',
    ]);

    json_response(['message' => 'Walk-in visit created successfully.'], 201);
}

json_response(['message' => 'Method not allowed.'], 405);
