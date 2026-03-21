<?php
declare(strict_types=1);

require_once dirname(__DIR__, 4) . '/bootstrap.php';

request_method('POST');

$user = require_auth($pdo);
require_roles($user, ['super_admin', 'hospital_admin', 'records_officer']);

$payload = request_body();
$claimId = (int) ($payload['id'] ?? 0);
$status = trim((string) ($payload['status'] ?? ''));

if ($claimId <= 0 || !in_array($status, ['approved', 'pending', 'rejected'], true)) {
    json_response(['message' => 'A valid claim and status are required.'], 422);
}

$pdo->prepare(
    'UPDATE insurance_claims
     SET status = :status
     WHERE id = :id AND hospital_id = :hospital_id'
)->execute([
    'status' => $status,
    'id' => $claimId,
    'hospital_id' => $user['hospital_id'],
]);

json_response(['message' => 'Claim status updated successfully.']);
