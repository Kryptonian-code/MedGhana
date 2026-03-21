<?php
declare(strict_types=1);

require_once dirname(__DIR__, 4) . '/bootstrap.php';

$user = require_auth($pdo);
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

if ($method === 'GET') {
    $statement = $pdo->prepare(
        'SELECT id, username, email, phone, full_name, role, hospital_id, branch_id
         FROM users
         WHERE id = :id
         LIMIT 1'
    );
    $statement->execute(['id' => $user['id']]);
    $profile = $statement->fetch();
    json_response(['profile' => $profile]);
}

if ($method === 'POST') {
    $payload = request_body();
    $fullName = trim((string) ($payload['full_name'] ?? ''));
    $email = trim((string) ($payload['email'] ?? ''));
    $phone = validate_digits_phone((string) ($payload['phone'] ?? ''), false);
    $currentPassword = (string) ($payload['current_password'] ?? '');
    $newPassword = (string) ($payload['new_password'] ?? '');
    $confirmPassword = (string) ($payload['confirm_password'] ?? '');

    if ($fullName === '' || $email === '') {
        json_response(['message' => 'Full name and email are required.'], 422);
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        json_response(['message' => 'Please provide a valid email address.'], 422);
    }

    $emailExists = $pdo->prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(:email) AND id != :id LIMIT 1');
    $emailExists->execute([
        'email' => $email,
        'id' => $user['id'],
    ]);
    if ($emailExists->fetch()) {
        json_response(['message' => 'That email is already in use.'], 409);
    }

    $updatePassword = false;
    if ($newPassword !== '' || $confirmPassword !== '' || $currentPassword !== '') {
      if ($newPassword === '' || $confirmPassword === '' || $currentPassword === '') {
          json_response(['message' => 'To change password, fill current, new, and confirm password.'], 422);
      }
      if ($newPassword !== $confirmPassword) {
          json_response(['message' => 'New password confirmation does not match.'], 422);
      }
      if (strlen($newPassword) < 8) {
          json_response(['message' => 'New password must be at least 8 characters long.'], 422);
      }

      $passwordStatement = $pdo->prepare('SELECT password_hash FROM users WHERE id = :id LIMIT 1');
      $passwordStatement->execute(['id' => $user['id']]);
      $currentHash = (string) $passwordStatement->fetchColumn();

      if (!password_verify($currentPassword, $currentHash)) {
          json_response(['message' => 'Current password is incorrect.'], 422);
      }

      $updatePassword = true;
    }

    if ($updatePassword) {
        $pdo->prepare(
            'UPDATE users
             SET full_name = :full_name, email = :email, phone = :phone, password_hash = :password_hash
             WHERE id = :id'
        )->execute([
            'full_name' => $fullName,
            'email' => $email,
            'phone' => $phone,
            'password_hash' => password_hash($newPassword, PASSWORD_DEFAULT),
            'id' => $user['id'],
        ]);
    } else {
        $pdo->prepare(
            'UPDATE users
             SET full_name = :full_name, email = :email, phone = :phone
             WHERE id = :id'
        )->execute([
            'full_name' => $fullName,
            'email' => $email,
            'phone' => $phone,
            'id' => $user['id'],
        ]);
    }

    json_response(['message' => 'Profile updated successfully.']);
}

json_response(['message' => 'Method not allowed.'], 405);
