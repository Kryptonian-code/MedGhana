<?php
declare(strict_types=1);

require_once dirname(__DIR__, 3) . '/bootstrap.php';

request_method('POST');

$payload = request_body();
$email = trim((string) ($payload['email'] ?? ''));
$password = (string) ($payload['password'] ?? '');

if ($email === '' || $password === '') {
    json_response(['message' => 'Email and password are required.'], 422);
}

$user = attempt_login($pdo, $email, $password, '');

json_response([
    'message' => 'Login successful.',
    'user' => $user,
]);
