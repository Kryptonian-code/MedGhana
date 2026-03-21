<?php
declare(strict_types=1);

require_once dirname(__DIR__, 4) . '/bootstrap.php';

$user = require_auth($pdo);
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

if ($method === 'GET') {
    [$drugScopeSql, $drugParams] = scoped_where_clause($user, 'd.hospital_id', 'd.branch_id');
    $drugsStatement = $pdo->prepare(
        'SELECT
            d.id,
            d.name,
            d.generic_name,
            d.category,
            d.dosage_form,
            d.strength,
            d.unit_price,
            d.stock_quantity,
            d.reorder_level,
            d.expiry_date,
            d.batch_number,
            d.supplier
         FROM drugs d
         ' . $drugScopeSql . '
         ORDER BY d.name ASC'
    );
    $drugsStatement->execute($drugParams);

    [$rxScopeSql, $rxParams] = scoped_where_clause($user, 'pr.hospital_id', 'pr.branch_id');
    $prescriptionsStatement = $pdo->prepare(
        'SELECT
            pr.id,
            pr.patient_id,
            pr.consultation_id,
            pr.drug_id,
            pr.drug_name,
            pr.dosage,
            pr.frequency,
            pr.duration,
            pr.quantity,
            pr.instructions,
            pr.status,
            pr.created_at,
            pr.dispensed_at,
            CONCAT(p.first_name, " ", p.last_name) AS patient_name,
            COALESCE(pr.doctor_id, 0) AS doctor_id,
            COALESCE(u.full_name, "Assigned doctor") AS doctor_name
         FROM prescriptions pr
         INNER JOIN patients p ON p.id = pr.patient_id
         LEFT JOIN users u ON u.id = pr.doctor_id
         ' . $rxScopeSql . '
         ORDER BY pr.created_at DESC'
    );
    $prescriptionsStatement->execute($rxParams);

    json_response([
        'drugs' => $drugsStatement->fetchAll(),
        'prescriptions' => $prescriptionsStatement->fetchAll(),
    ]);
}

if ($method === 'POST') {
    require_roles($user, ['super_admin', 'hospital_admin', 'medical_director', 'doctor']);
    $payload = request_body();

    $patientId = (int) ($payload['patient_id'] ?? 0);
    $drugId = isset($payload['drug_id']) && $payload['drug_id'] !== '' ? (int) $payload['drug_id'] : null;
    $drugName = trim((string) ($payload['drug_name'] ?? ''));
    $dosage = trim((string) ($payload['dosage'] ?? ''));
    $frequency = trim((string) ($payload['frequency'] ?? ''));
    $duration = trim((string) ($payload['duration'] ?? ''));
    $quantity = max(1, (int) ($payload['quantity'] ?? 1));
    $instructions = trim((string) ($payload['instructions'] ?? ''));
    $consultationId = isset($payload['consultation_id']) && $payload['consultation_id'] !== '' ? (int) $payload['consultation_id'] : null;

    if ($patientId <= 0 || $drugName === '' || $dosage === '' || $frequency === '' || $duration === '') {
        json_response(['message' => 'Patient, drug, dosage, frequency, and duration are required.'], 422);
    }

    $pdo->prepare(
        'INSERT INTO prescriptions (
            hospital_id, branch_id, patient_id, doctor_id, consultation_id, drug_id, drug_name, dosage, frequency, duration, quantity, instructions, status
        ) VALUES (
            :hospital_id, :branch_id, :patient_id, :doctor_id, :consultation_id, :drug_id, :drug_name, :dosage, :frequency, :duration, :quantity, :instructions, "pending"
        )'
    )->execute([
        'hospital_id' => $user['hospital_id'],
        'branch_id' => $user['branch_id'] ?: null,
        'patient_id' => $patientId,
        'doctor_id' => $user['id'],
        'consultation_id' => $consultationId,
        'drug_id' => $drugId,
        'drug_name' => $drugName,
        'dosage' => $dosage,
        'frequency' => $frequency,
        'duration' => $duration,
        'quantity' => $quantity,
        'instructions' => $instructions !== '' ? $instructions : null,
    ]);
    $prescriptionId = (int) $pdo->lastInsertId();

    $patientStatement = $pdo->prepare('SELECT first_name, last_name, hospital_number FROM patients WHERE id = :id LIMIT 1');
    $patientStatement->execute(['id' => $patientId]);
    $patient = $patientStatement->fetch();
    if ($patient) {
        notify_roles($pdo, $user, ['pharmacist'], [
            'patient_id' => $patientId,
            'type' => 'pharmacy_queue',
            'title' => 'Prescription waiting in pharmacy',
            'message' => sprintf(
                '%s %s (%s) has a new prescription ready for dispensing.',
                $patient['first_name'],
                $patient['last_name'],
                $patient['hospital_number']
            ),
            'link' => '/pharmacy',
        ]);
    }

    record_audit_log($pdo, $user, 'prescription_created', 'prescription', $prescriptionId, [
        'patient_id' => $patientId,
        'consultation_id' => $consultationId,
        'drug_name' => $drugName,
    ]);

    json_response(['message' => 'Prescription created successfully.'], 201);
}

json_response(['message' => 'Method not allowed.'], 405);
