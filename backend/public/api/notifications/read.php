<?php
declare(strict_types=1);

require_once dirname(__DIR__, 4) . '/bootstrap.php';

request_method('POST');

$user = require_auth($pdo);
$payload = request_body();
$notificationId = isset($payload['id']) ? (int) $payload['id'] : null;

$params = [
    'hospital_id' => $user['hospital_id'],
    'role_target' => $user['role'],
    'user_id' => $user['id'],
];

$sql = 'UPDATE notifications
        SET is_read = 1, read_at = NOW()
        WHERE hospital_id = :hospital_id
          AND (role_target = :role_target OR user_id = :user_id OR (role_target IS NULL AND user_id IS NULL))';

if (!can_access_all_branches($user) && !empty($user['branch_id'])) {
    $sql .= ' AND branch_id = :branch_id';
    $params['branch_id'] = $user['branch_id'];
}

if ($notificationId) {
    $sql .= ' AND id = :id';
    $params['id'] = $notificationId;
}

$statement = $pdo->prepare($sql);
$statement->execute($params);

json_response(['message' => 'Notification state updated.']);
