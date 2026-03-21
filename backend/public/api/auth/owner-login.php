<?php
declare(strict_types=1);

require_once dirname(__DIR__, 3) . '/bootstrap.php';

request_method('POST');

$payload = request_body();
$username = trim((string) ($payload['username'] ?? ''));
$password = (string) ($payload['password'] ?? '');

if ($username === '' || $password === '') {
    json_response(['message' => 'Owner username and password are required.'], 422);
}

$user = attempt_owner_login($pdo, $username, $password);

json_response([
    'message' => 'Owner login successful.',
    'user' => $user,
]);
