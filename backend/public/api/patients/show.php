<?php
declare(strict_types=1);

require_once dirname(__DIR__, 4) . '/bootstrap.php';

request_method('GET');

$user = require_auth($pdo);
$patientId = (int) ($_GET['id'] ?? 0);

if ($patientId <= 0) {
    json_response(['message' => 'Patient id is required.'], 422);
}

$patientQuery = 'SELECT
    p.*,
    CONCAT(p.first_name, " ", p.last_name) AS full_name
  FROM patients p';

[$scopeSql, $scopeParams] = scoped_where_clause($user, 'p.hospital_id', 'p.branch_id');
$patientQuery .= $scopeSql . ' AND p.id = :id LIMIT 1';
$patientParams = array_merge($scopeParams, ['id' => $patientId]);

$patientStatement = $pdo->prepare($patientQuery);
$patientStatement->execute($patientParams);
$patient = $patientStatement->fetch();

if (!$patient) {
    json_response(['message' => 'Patient not found.'], 404);
}

$appointmentsStatement = $pdo->prepare(
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
        a.created_at
     FROM appointments a
     WHERE a.patient_id = :patient_id AND a.hospital_id = :hospital_id
     ORDER BY a.appointment_date DESC, a.appointment_time DESC
     LIMIT 10'
);
$appointmentsStatement->execute([
    'patient_id' => $patientId,
    'hospital_id' => $user['hospital_id'],
]);

$visitsStatement = $pdo->prepare(
    'SELECT
        v.id,
        v.patient_id,
        v.appointment_id,
        v.visit_date,
        v.visit_time,
        v.source,
        v.status,
        v.queue_number,
        v.complaint,
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
     LEFT JOIN triage_records tr ON tr.visit_id = v.id
     WHERE v.patient_id = :patient_id AND v.hospital_id = :hospital_id
     ORDER BY v.visit_date DESC, v.visit_time DESC
     LIMIT 10'
);
$visitsStatement->execute([
    'patient_id' => $patientId,
    'hospital_id' => $user['hospital_id'],
]);

$invoicesStatement = $pdo->prepare(
    'SELECT
        i.id,
        i.patient_id,
        i.invoice_number,
        i.total_amount,
        i.paid_amount,
        i.balance,
        i.status,
        i.payment_method,
        i.created_at
     FROM invoices i
     WHERE i.patient_id = :patient_id AND i.hospital_id = :hospital_id
     ORDER BY i.created_at DESC
     LIMIT 10'
);
$invoicesStatement->execute([
    'patient_id' => $patientId,
    'hospital_id' => $user['hospital_id'],
]);

json_response([
    'patient' => $patient,
    'appointments' => $appointmentsStatement->fetchAll(),
    'visits' => $visitsStatement->fetchAll(),
    'invoices' => $invoicesStatement->fetchAll(),
]);
