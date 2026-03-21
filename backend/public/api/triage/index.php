<?php
declare(strict_types=1);

require_once dirname(__DIR__, 4) . '/bootstrap.php';

$user = require_auth($pdo);
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

if ($method === 'GET') {
    [$scopeSql, $params] = scoped_where_clause($user, 'v.hospital_id', 'v.branch_id');
    $statement = $pdo->prepare(
        'SELECT
            v.id,
            v.patient_id,
            v.visit_date,
            v.visit_time,
            v.source,
            v.status,
            v.queue_number,
            v.complaint,
            CONCAT(p.first_name, " ", p.last_name) AS patient_name,
            p.hospital_number,
            tr.temperature,
            tr.pulse,
            tr.respiratory_rate,
            tr.blood_pressure_systolic,
            tr.blood_pressure_diastolic,
            tr.oxygen_saturation,
            tr.weight,
            tr.height,
            tr.bmi,
            tr.notes AS triage_notes
         FROM visits v
         INNER JOIN patients p ON p.id = v.patient_id
         LEFT JOIN triage_records tr ON tr.visit_id = v.id
         ' . $scopeSql . '
         ORDER BY v.visit_date DESC, v.visit_time DESC'
    );
    $statement->execute($params);
    json_response(['visits' => $statement->fetchAll()]);
}

if ($method === 'POST') {
    require_roles($user, ['super_admin', 'hospital_admin', 'medical_director', 'doctor', 'nurse']);

    $payload = request_body();
    $visitId = (int) ($payload['visit_id'] ?? 0);
    $patientId = (int) ($payload['patient_id'] ?? 0);

    if ($visitId <= 0 || $patientId <= 0) {
        json_response(['message' => 'Visit and patient are required.'], 422);
    }

    $height = isset($payload['height']) && $payload['height'] !== '' ? (float) $payload['height'] : null;
    $weight = isset($payload['weight']) && $payload['weight'] !== '' ? (float) $payload['weight'] : null;
    $bmi = null;
    if ($height && $weight && $height > 0) {
        $heightMeters = $height / 100;
        $bmi = round($weight / ($heightMeters * $heightMeters), 2);
    }

    $pdo->prepare(
        'INSERT INTO triage_records (
            hospital_id, branch_id, patient_id, visit_id, temperature, pulse, respiratory_rate, blood_pressure_systolic,
            blood_pressure_diastolic, oxygen_saturation, weight, height, bmi, notes, recorded_by
        ) VALUES (
            :hospital_id, :branch_id, :patient_id, :visit_id, :temperature, :pulse, :respiratory_rate, :blood_pressure_systolic,
            :blood_pressure_diastolic, :oxygen_saturation, :weight, :height, :bmi, :notes, :recorded_by
        )'
    )->execute([
        'hospital_id' => $user['hospital_id'],
        'branch_id' => $user['branch_id'] ?: null,
        'patient_id' => $patientId,
        'visit_id' => $visitId,
        'temperature' => nullable_decimal($payload['temperature'] ?? null),
        'pulse' => nullable_int($payload['pulse'] ?? null),
        'respiratory_rate' => nullable_int($payload['respiratory_rate'] ?? null),
        'blood_pressure_systolic' => nullable_int($payload['blood_pressure_systolic'] ?? null),
        'blood_pressure_diastolic' => nullable_int($payload['blood_pressure_diastolic'] ?? null),
        'oxygen_saturation' => nullable_int($payload['oxygen_saturation'] ?? null),
        'weight' => $weight,
        'height' => $height,
        'bmi' => $bmi,
        'notes' => nullable_string($payload['notes'] ?? null),
        'recorded_by' => $user['id'],
    ]);

    $pdo->prepare(
        'UPDATE visits SET status = "triaged", triaged_by = :user_id WHERE id = :visit_id'
    )->execute([
        'user_id' => $user['id'],
        'visit_id' => $visitId,
    ]);

    $patientStatement = $pdo->prepare(
        'SELECT hospital_number, first_name, last_name FROM patients WHERE id = :id LIMIT 1'
    );
    $patientStatement->execute(['id' => $patientId]);
    $patient = $patientStatement->fetch();

    if ($patient) {
        $patientName = trim($patient['first_name'] . ' ' . $patient['last_name']);
        notify_roles($pdo, $user, ['doctor', 'medical_director'], [
            'patient_id' => $patientId,
            'type' => 'consultation_queue',
            'title' => 'Patient ready for consultation',
            'message' => sprintf(
                '%s (%s) has completed triage and is ready for doctor review.',
                $patientName,
                $patient['hospital_number']
            ),
            'link' => '/consultations',
        ]);
    }

    record_audit_log($pdo, $user, 'triage_recorded', 'visit', $visitId, [
        'patient_id' => $patientId,
        'bmi' => $bmi,
    ]);

    json_response(['message' => 'Triage recorded successfully.'], 201);
}

json_response(['message' => 'Method not allowed.'], 405);

function nullable_decimal(mixed $value): ?float
{
    return $value === '' || $value === null ? null : (float) $value;
}

function nullable_int(mixed $value): ?int
{
    return $value === '' || $value === null ? null : (int) $value;
}

function nullable_string(mixed $value): ?string
{
    $trimmed = trim((string) $value);
    return $trimmed === '' ? null : $trimmed;
}
