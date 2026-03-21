<?php
declare(strict_types=1);

require_once dirname(__DIR__, 4) . '/bootstrap.php';

$user = require_auth($pdo);
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

if ($method === 'GET') {
    [$scopeSql, $params] = scoped_where_clause($user, 'l.hospital_id', 'l.branch_id');
    $statement = $pdo->prepare(
        'SELECT
            l.id,
            l.patient_id,
            l.consultation_id,
            l.test_name,
            l.test_category,
            l.priority,
            l.status,
            l.sample_type,
            l.clinical_notes,
            l.results,
            l.result_notes,
            l.created_at,
            CONCAT(p.first_name, " ", p.last_name) AS patient_name,
            COALESCE(u.full_name, "Assigned doctor") AS doctor_name
         FROM lab_orders l
         INNER JOIN patients p ON p.id = l.patient_id
         LEFT JOIN users u ON u.id = l.doctor_id
         ' . $scopeSql . '
         ORDER BY l.created_at DESC'
    );
    $statement->execute($params);
    json_response(['lab_orders' => $statement->fetchAll()]);
}

if ($method === 'POST') {
    require_roles($user, ['super_admin', 'hospital_admin', 'medical_director', 'doctor', 'lab_scientist']);
    $payload = request_body();

    $patientId = (int) ($payload['patient_id'] ?? 0);
    $testName = trim((string) ($payload['test_name'] ?? ''));
    $testCategory = trim((string) ($payload['test_category'] ?? ''));
    $priority = trim((string) ($payload['priority'] ?? 'routine'));
    $sampleType = trim((string) ($payload['sample_type'] ?? ''));
    $clinicalNotes = trim((string) ($payload['clinical_notes'] ?? ''));

    if ($patientId <= 0 || $testName === '' || $testCategory === '') {
        json_response(['message' => 'Patient, test name, and category are required.'], 422);
    }

    $pdo->prepare(
        'INSERT INTO lab_orders (
            hospital_id, branch_id, patient_id, doctor_id, consultation_id, test_name, test_category, priority, sample_type, clinical_notes, status
        ) VALUES (
            :hospital_id, :branch_id, :patient_id, :doctor_id, :consultation_id, :test_name, :test_category, :priority, :sample_type, :clinical_notes, "ordered"
        )'
    )->execute([
        'hospital_id' => $user['hospital_id'],
        'branch_id' => $user['branch_id'] ?: null,
        'patient_id' => $patientId,
        'doctor_id' => $user['id'],
        'consultation_id' => isset($payload['consultation_id']) && $payload['consultation_id'] !== '' ? (int) ($payload['consultation_id']) : null,
        'test_name' => $testName,
        'test_category' => $testCategory,
        'priority' => in_array($priority, ['routine', 'urgent', 'stat'], true) ? $priority : 'routine',
        'sample_type' => $sampleType !== '' ? $sampleType : null,
        'clinical_notes' => $clinicalNotes !== '' ? $clinicalNotes : null,
    ]);
    $labOrderId = (int) $pdo->lastInsertId();

    $patientStatement = $pdo->prepare('SELECT first_name, last_name, hospital_number FROM patients WHERE id = :id LIMIT 1');
    $patientStatement->execute(['id' => $patientId]);
    $patient = $patientStatement->fetch();
    if ($patient) {
        notify_roles($pdo, $user, ['lab_scientist'], [
            'patient_id' => $patientId,
            'type' => 'lab_queue',
            'title' => 'New laboratory order',
            'message' => sprintf(
                '%s %s (%s) has a new %s request.',
                $patient['first_name'],
                $patient['last_name'],
                $patient['hospital_number'],
                $testName
            ),
            'link' => '/laboratory',
        ]);
    }

    record_audit_log($pdo, $user, 'lab_order_created', 'lab_order', $labOrderId, [
        'patient_id' => $patientId,
        'test_name' => $testName,
    ]);

    json_response(['message' => 'Lab order created successfully.'], 201);
}

json_response(['message' => 'Method not allowed.'], 405);
