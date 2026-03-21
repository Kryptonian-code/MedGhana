<?php
declare(strict_types=1);

require_once dirname(__DIR__, 4) . '/bootstrap.php';

request_method('POST');

$user = require_auth($pdo);
require_roles($user, ['super_admin', 'hospital_admin', 'medical_director', 'doctor', 'nurse']);

$payload = request_body();
$admissionId = (int) ($payload['id'] ?? 0);
$status = trim((string) ($payload['status'] ?? ''));
$dischargeDate = trim((string) ($payload['discharge_date'] ?? date('Y-m-d')));

if ($admissionId <= 0 || !in_array($status, ['discharged', 'transferred'], true)) {
    json_response(['message' => 'A valid admission and status are required.'], 422);
}

$statement = $pdo->prepare(
    'SELECT a.id, a.ward_id
     FROM admissions a
     WHERE a.id = :id AND a.hospital_id = :hospital_id
     LIMIT 1'
);
$statement->execute([
    'id' => $admissionId,
    'hospital_id' => $user['hospital_id'],
]);
$admission = $statement->fetch();

if (!$admission) {
    json_response(['message' => 'Admission not found.'], 404);
}

$pdo->beginTransaction();
try {
    $pdo->prepare(
        'UPDATE admissions
         SET status = :status, discharge_date = :discharge_date
         WHERE id = :id'
    )->execute([
        'status' => $status,
        'discharge_date' => $dischargeDate,
        'id' => $admissionId,
    ]);

    $pdo->prepare(
        'UPDATE wards
         SET occupied_beds = GREATEST(occupied_beds - 1, 0)
         WHERE id = :id'
    )->execute(['id' => $admission['ward_id']]);

    $pdo->commit();
} catch (Throwable $exception) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    json_response(['message' => 'Unable to update admission.', 'error' => $exception->getMessage()], 500);
}

json_response(['message' => 'Admission updated successfully.']);
