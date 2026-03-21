<?php
declare(strict_types=1);

require_once dirname(__DIR__, 4) . '/bootstrap.php';

request_method('POST');

$user = require_auth($pdo);
require_roles($user, ['super_admin', 'hospital_admin', 'pharmacist']);

$payload = request_body();
$prescriptionId = (int) ($payload['id'] ?? 0);

if ($prescriptionId <= 0) {
    json_response(['message' => 'Prescription id is required.'], 422);
}

$statement = $pdo->prepare(
    'SELECT pr.*, p.first_name, p.last_name, p.hospital_number
     FROM prescriptions pr
     INNER JOIN patients p ON p.id = pr.patient_id
     WHERE pr.id = :id AND pr.hospital_id = :hospital_id LIMIT 1'
);
$statement->execute([
    'id' => $prescriptionId,
    'hospital_id' => $user['hospital_id'],
]);
$prescription = $statement->fetch();

if (!$prescription) {
    json_response(['message' => 'Prescription not found.'], 404);
}

$pdo->beginTransaction();

try {
    if (!empty($prescription['drug_id'])) {
        $pdo->prepare(
            'UPDATE drugs
             SET stock_quantity = GREATEST(stock_quantity - :quantity, 0)
             WHERE id = :drug_id AND hospital_id = :hospital_id'
        )->execute([
            'quantity' => $prescription['quantity'],
            'drug_id' => $prescription['drug_id'],
            'hospital_id' => $user['hospital_id'],
        ]);
    }

    $pdo->prepare(
        'UPDATE prescriptions
         SET status = "dispensed", dispensed_by = :user_id, dispensed_at = NOW()
         WHERE id = :id'
    )->execute([
        'user_id' => $user['id'],
        'id' => $prescriptionId,
    ]);

    notify_roles($pdo, $user, ['records_officer'], [
        'patient_id' => $prescription['patient_id'],
        'type' => 'prescription_dispensed',
        'title' => 'Prescription dispensed',
        'message' => sprintf(
            '%s %s (%s) has had medication dispensed.',
            $prescription['first_name'],
            $prescription['last_name'],
            $prescription['hospital_number']
        ),
        'link' => '/medical-records',
    ]);

    record_audit_log($pdo, $user, 'prescription_dispensed', 'prescription', $prescriptionId, [
        'patient_id' => (int) $prescription['patient_id'],
        'drug_name' => $prescription['drug_name'],
        'quantity' => (int) $prescription['quantity'],
    ]);

    $pdo->commit();
} catch (Throwable $exception) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    json_response(['message' => 'Unable to dispense prescription.', 'error' => $exception->getMessage()], 500);
}

json_response(['message' => 'Prescription dispensed successfully.']);
