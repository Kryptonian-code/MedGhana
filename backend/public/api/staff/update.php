<?php
declare(strict_types=1);

require_once dirname(__DIR__, 4) . '/bootstrap.php';

request_method('POST');

$user = require_auth($pdo);
require_roles($user, ['super_admin', 'hospital_admin']);

$payload = request_body();
$staffId = (int) ($payload['id'] ?? 0);
$role = trim((string) ($payload['role'] ?? ''));
$status = trim((string) ($payload['status'] ?? ''));

if ($staffId <= 0 || $role === '' || $status === '') {
    json_response(['message' => 'Staff id, role, and status are required.'], 422);
}

$statement = $pdo->prepare('SELECT id FROM users WHERE id = :id AND hospital_id = :hospital_id LIMIT 1');
$statement->execute([
    'id' => $staffId,
    'hospital_id' => $user['hospital_id'],
]);

if (!$statement->fetch()) {
    json_response(['message' => 'Staff member not found.'], 404);
}

$pdo->prepare(
    'UPDATE users
     SET role = :role, status = :status
     WHERE id = :id'
)->execute([
    'role' => $role,
    'status' => $status,
    'id' => $staffId,
]);

json_response(['message' => 'Staff record updated successfully.']);
