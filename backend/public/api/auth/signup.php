<?php
declare(strict_types=1);

require_once dirname(__DIR__, 3) . '/bootstrap.php';

request_method('POST');

$payload = request_body();

$hospitalName = trim((string) ($payload['hospital_name'] ?? ''));
$hospitalCode = trim((string) ($payload['hospital_code'] ?? ''));
$branchName = trim((string) ($payload['branch_name'] ?? ''));
$adminName = trim((string) ($payload['admin_name'] ?? ''));
$email = trim((string) ($payload['email'] ?? ''));
$password = (string) ($payload['password'] ?? '');
$phone = validate_digits_phone((string) ($payload['phone'] ?? ''), false);
$address = trim((string) ($payload['address'] ?? ''));

if ($hospitalName === '' || $branchName === '' || $adminName === '' || $email === '' || $password === '') {
    json_response(['message' => 'Hospital name, branch name, admin name, email, and password are required.'], 422);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_response(['message' => 'Please provide a valid email address.'], 422);
}

if (strlen($password) < 8) {
    json_response(['message' => 'Password must be at least 8 characters long.'], 422);
}

$hospitalCode = $hospitalCode !== '' ? slugify_code($hospitalCode) : slugify_code($hospitalName);

$hospitalExists = $pdo->prepare('SELECT id FROM hospitals WHERE LOWER(code) = LOWER(:code) LIMIT 1');
$hospitalExists->execute(['code' => $hospitalCode]);

if ($hospitalExists->fetch()) {
    json_response(['message' => 'That hospital code is already in use.'], 409);
}

$emailExists = $pdo->prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(:email) LIMIT 1');
$emailExists->execute(['email' => $email]);

if ($emailExists->fetch()) {
    json_response(['message' => 'That admin email is already in use.'], 409);
}

try {
    $pdo->beginTransaction();

    $hospitalInsert = $pdo->prepare(
        'INSERT INTO hospitals (name, code, email, phone, address) VALUES (:name, :code, :email, :phone, :address)'
    );
    $hospitalInsert->execute([
        'name' => $hospitalName,
        'code' => $hospitalCode,
        'email' => $email,
        'phone' => $phone !== '' ? $phone : null,
        'address' => $address !== '' ? $address : null,
    ]);
    $hospitalId = (int) $pdo->lastInsertId();

    $branchInsert = $pdo->prepare(
        'INSERT INTO branches (hospital_id, name, code, location, is_main) VALUES (:hospital_id, :name, :code, :location, 1)'
    );
    $branchInsert->execute([
        'hospital_id' => $hospitalId,
        'name' => $branchName,
        'code' => 'main',
        'location' => $address !== '' ? $address : null,
    ]);
    $branchId = (int) $pdo->lastInsertId();

    $userInsert = $pdo->prepare(
        'INSERT INTO users (hospital_id, branch_id, username, full_name, email, phone, password_hash, role, status)
         VALUES (:hospital_id, :branch_id, :username, :full_name, :email, :phone, :password_hash, :role, "active")'
    );
    $userInsert->execute([
        'hospital_id' => $hospitalId,
        'branch_id' => $branchId,
        'username' => null,
        'full_name' => $adminName,
        'email' => $email,
        'phone' => $phone,
        'password_hash' => password_hash($password, PASSWORD_DEFAULT),
        'role' => 'hospital_admin',
    ]);
    $userId = (int) $pdo->lastInsertId();

    $pdo->commit();

    session_regenerate_id(true);
    $_SESSION['user_id'] = $userId;
} catch (Throwable $exception) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    json_response([
        'message' => 'Unable to create hospital account right now.',
        'error' => $exception->getMessage(),
    ], 500);
}

$statement = $pdo->prepare(
    'SELECT
        u.id,
        u.username,
        u.email,
        u.phone,
        u.full_name,
        u.role,
        u.hospital_id,
        u.branch_id,
        h.name AS hospital_name,
        h.code AS hospital_code,
        b.name AS branch_name,
        b.code AS branch_code
     FROM users u
     INNER JOIN hospitals h ON h.id = u.hospital_id
     LEFT JOIN branches b ON b.id = u.branch_id
     WHERE u.id = :id
     LIMIT 1'
);
$statement->execute(['id' => $userId]);

json_response([
    'message' => 'Hospital account created successfully.',
    'user' => $statement->fetch(),
], 201);
