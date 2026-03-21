<?php
declare(strict_types=1);

require_once dirname(__DIR__, 4) . '/bootstrap.php';

request_method('GET');

$user = require_auth($pdo);
$query = trim((string) ($_GET['scope'] ?? 'unread'));
$limit = max(1, min(20, (int) ($_GET['limit'] ?? 8)));

$params = [
    'hospital_id' => $user['hospital_id'],
    'role_target' => $user['role'],
    'user_id' => $user['id'],
];

$sql = 'SELECT id, type, title, message, link, is_read, created_at
        FROM notifications
        WHERE hospital_id = :hospital_id
          AND (role_target = :role_target OR user_id = :user_id OR (role_target IS NULL AND user_id IS NULL))';

if (!can_access_all_branches($user) && !empty($user['branch_id'])) {
    $sql .= ' AND branch_id = :branch_id';
    $params['branch_id'] = $user['branch_id'];
}

if ($query === 'unread') {
    $sql .= ' AND is_read = 0';
}

$sql .= ' ORDER BY created_at DESC LIMIT ' . $limit;

$statement = $pdo->prepare($sql);
$statement->execute($params);
$notifications = $statement->fetchAll();

$countStatement = $pdo->prepare(
    'SELECT COUNT(*)
     FROM notifications
     WHERE hospital_id = :hospital_id
       AND is_read = 0
       AND (role_target = :role_target OR user_id = :user_id OR (role_target IS NULL AND user_id IS NULL))'
    . (!can_access_all_branches($user) && !empty($user['branch_id']) ? ' AND branch_id = :branch_id' : '')
);
$countStatement->execute($params);

json_response([
    'notifications' => $notifications,
    'unread_count' => (int) $countStatement->fetchColumn(),
]);
