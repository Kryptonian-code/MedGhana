<?php
declare(strict_types=1);

require_once dirname(__DIR__, 4) . '/bootstrap.php';

$user = require_auth($pdo);
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

require_roles($user, ['super_admin', 'hospital_admin']);

if ($method === 'GET') {
    [$scopeSql, $params] = scoped_where_clause($user, 'u.hospital_id', 'u.branch_id');
    $statement = $pdo->prepare(
        'SELECT
            u.id,
            u.username,
            u.email,
            u.full_name,
            u.role,
            u.status,
            u.branch_id,
            b.name AS branch_name,
            u.created_at
         FROM users u
         LEFT JOIN branches b ON b.id = u.branch_id
         ' . $scopeSql . '
         ORDER BY u.created_at DESC'
    );
    $statement->execute($params);
    json_response(['staff' => $statement->fetchAll()]);
}

if ($method === 'POST') {
    $payload = request_body();
    $fullName = trim((string) ($payload['full_name'] ?? ''));
    $email = trim((string) ($payload['email'] ?? ''));
    $phone = validate_digits_phone((string) ($payload['phone'] ?? ''), false);
    $role = trim((string) ($payload['role'] ?? ''));
    $password = (string) ($payload['password'] ?? '');
    $branchId = isset($payload['branch_id']) && $payload['branch_id'] !== '' ? (int) $payload['branch_id'] : null;

    if ($fullName === '' || $email === '' || $role === '' || $password === '') {
        json_response(['message' => 'Full name, email, role, and password are required.'], 422);
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        json_response(['message' => 'Please provide a valid email address.'], 422);
    }

    if (strlen($password) < 8) {
        json_response(['message' => 'Password must be at least 8 characters long.'], 422);
    }

    if (!in_array($role, ['hospital_admin', 'medical_director', 'doctor', 'nurse', 'pharmacist', 'lab_scientist', 'receptionist', 'cashier', 'records_officer'], true)) {
        json_response(['message' => 'Please choose a valid staff role.'], 422);
    }

    $emailExists = $pdo->prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(:email) LIMIT 1');
    $emailExists->execute(['email' => $email]);
    if ($emailExists->fetch()) {
        json_response(['message' => 'That email is already in use.'], 409);
    }

    $pdo->prepare(
        'INSERT INTO users (hospital_id, branch_id, username, full_name, email, phone, password_hash, role, status)
         VALUES (:hospital_id, :branch_id, NULL, :full_name, :email, :phone, :password_hash, :role, "active")'
    )->execute([
        'hospital_id' => $user['hospital_id'],
        'branch_id' => $branchId ?: ($user['branch_id'] ?: null),
        'full_name' => $fullName,
        'email' => $email,
        'phone' => $phone,
        'password_hash' => password_hash($password, PASSWORD_DEFAULT),
        'role' => $role,
    ]);

    if ($phone !== '') {
        create_notification($pdo, $user, [
            'type' => 'staff_added',
            'title' => 'New staff account created',
            'message' => sprintf('%s has been added as %s.', $fullName, str_replace('_', ' ', $role)),
            'link' => '/staff',
        ]);
    }

    json_response(['message' => 'Staff created successfully.'], 201);
}

json_response(['message' => 'Method not allowed.'], 405);
