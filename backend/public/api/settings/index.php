<?php
declare(strict_types=1);

require_once dirname(__DIR__, 4) . '/bootstrap.php';

$user = require_auth($pdo);
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

require_roles($user, ['super_admin', 'hospital_admin']);
ensure_default_hospital_settings($pdo, $user);

if ($method === 'GET') {
    $statement = $pdo->prepare(
        'SELECT *
         FROM hospital_settings
         WHERE hospital_id = :hospital_id AND (branch_id <=> :branch_id)
         LIMIT 1'
    );
    $statement->execute([
        'hospital_id' => $user['hospital_id'],
        'branch_id' => $user['branch_id'] ?: null,
    ]);
    json_response(['settings' => $statement->fetch()]);
}

if ($method === 'POST') {
    $payload = request_body();

    $pdo->prepare(
        'UPDATE hospital_settings
         SET hospital_name = :hospital_name,
             license_number = :license_number,
             phone = :phone,
             email = :email,
             address = :address,
             auto_generate_hospital_numbers = :auto_generate_hospital_numbers,
             nhis_integration_enabled = :nhis_integration_enabled,
             sms_notifications_enabled = :sms_notifications_enabled,
             receipt_auto_print_enabled = :receipt_auto_print_enabled
         WHERE hospital_id = :hospital_id AND (branch_id <=> :branch_id)'
    )->execute([
        'hospital_name' => trim((string) ($payload['hospital_name'] ?? '')),
        'license_number' => nullable_string($payload['license_number'] ?? null),
        'phone' => validate_digits_phone((string) ($payload['phone'] ?? ''), false),
        'email' => nullable_string($payload['email'] ?? null),
        'address' => nullable_string($payload['address'] ?? null),
        'auto_generate_hospital_numbers' => !empty($payload['auto_generate_hospital_numbers']) ? 1 : 0,
        'nhis_integration_enabled' => !empty($payload['nhis_integration_enabled']) ? 1 : 0,
        'sms_notifications_enabled' => !empty($payload['sms_notifications_enabled']) ? 1 : 0,
        'receipt_auto_print_enabled' => !empty($payload['receipt_auto_print_enabled']) ? 1 : 0,
        'hospital_id' => $user['hospital_id'],
        'branch_id' => $user['branch_id'] ?: null,
    ]);

    json_response(['message' => 'Settings saved successfully.']);
}

json_response(['message' => 'Method not allowed.'], 405);

function nullable_string(mixed $value): ?string
{
    $trimmed = trim((string) $value);
    return $trimmed === '' ? null : $trimmed;
}
