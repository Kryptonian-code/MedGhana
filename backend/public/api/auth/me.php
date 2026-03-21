<?php
declare(strict_types=1);

require_once dirname(__DIR__, 3) . '/bootstrap.php';

request_method('GET');

$user = current_user($pdo);

if (!$user) {
    json_response(['message' => 'No active session.'], 401);
}

json_response(['user' => $user]);
