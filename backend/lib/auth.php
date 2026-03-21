<?php
declare(strict_types=1);

function current_user(PDO $pdo): ?array
{
    $userId = $_SESSION['user_id'] ?? null;

    if (!$userId) {
        return null;
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
         WHERE u.id = :id AND u.status = "active"
         LIMIT 1'
    );
    $statement->execute(['id' => $userId]);
    $user = $statement->fetch();

    if (!$user) {
        unset($_SESSION['user_id']);
        return null;
    }

    return $user;
}

function require_auth(PDO $pdo): array
{
    $user = current_user($pdo);

    if (!$user) {
        json_response(['message' => 'Unauthorized.'], 401);
    }

    return $user;
}

function attempt_login(PDO $pdo, string $email, string $password, string $hospitalCode): array
{
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
            u.password_hash,
            h.name AS hospital_name,
            h.code AS hospital_code,
            b.name AS branch_name,
            b.code AS branch_code
         FROM users u
         INNER JOIN hospitals h ON h.id = u.hospital_id
         LEFT JOIN branches b ON b.id = u.branch_id
         WHERE LOWER(u.email) = LOWER(:email)
           AND u.status = "active"
         LIMIT 1'
    );
    $statement->execute([
        'email' => $email,
    ]);

    $user = $statement->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        json_response(['message' => 'Invalid email or password.'], 401);
    }

    session_regenerate_id(true);
    $_SESSION['user_id'] = $user['id'];

    $pdo->prepare('UPDATE users SET last_login_at = NOW() WHERE id = :id')->execute(['id' => $user['id']]);

    unset($user['password_hash']);

    return $user;
}

function attempt_owner_login(PDO $pdo, string $username, string $password): array
{
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
            u.password_hash,
            h.name AS hospital_name,
            h.code AS hospital_code,
            b.name AS branch_name,
            b.code AS branch_code
         FROM users u
         INNER JOIN hospitals h ON h.id = u.hospital_id
         LEFT JOIN branches b ON b.id = u.branch_id
         WHERE LOWER(u.username) = LOWER(:username)
           AND u.role = "super_admin"
           AND u.status = "active"
         LIMIT 1'
    );
    $statement->execute(['username' => $username]);
    $user = $statement->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        json_response(['message' => 'Invalid owner username or password.'], 401);
    }

    session_regenerate_id(true);
    $_SESSION['user_id'] = $user['id'];
    $pdo->prepare('UPDATE users SET last_login_at = NOW() WHERE id = :id')->execute(['id' => $user['id']]);
    unset($user['password_hash']);

    return $user;
}

function ensure_owner_account(PDO $pdo): void
{
    $ownerUsername = 'Joseph';
    $ownerEmail = 'joseph@medghana-owner.local';
    $ownerPassword = 'Joseph123@!';

    $ownerStatement = $pdo->prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(:username) LIMIT 1');
    $ownerStatement->execute(['username' => $ownerUsername]);

    if ($ownerStatement->fetch()) {
        return;
    }

    $pdo->beginTransaction();

    try {
        $hospitalStatement = $pdo->prepare('SELECT id FROM hospitals WHERE LOWER(code) = LOWER(:code) LIMIT 1');
        $hospitalStatement->execute(['code' => 'medghana-owner']);
        $hospitalId = (int) $hospitalStatement->fetchColumn();

        if ($hospitalId <= 0) {
            $pdo->prepare(
                'INSERT INTO hospitals (name, code, email, phone, address, status)
                 VALUES ("MedGhana Owner Workspace", "medghana-owner", :email, NULL, "Head Office", "active")'
            )->execute(['email' => $ownerEmail]);
            $hospitalId = (int) $pdo->lastInsertId();
        }

        $branchStatement = $pdo->prepare('SELECT id FROM branches WHERE hospital_id = :hospital_id AND code = "hq" LIMIT 1');
        $branchStatement->execute(['hospital_id' => $hospitalId]);
        $branchId = (int) $branchStatement->fetchColumn();

        if ($branchId <= 0) {
            $pdo->prepare(
                'INSERT INTO branches (hospital_id, name, code, location, is_main)
                 VALUES (:hospital_id, "Head Office", "hq", "MedGhana HQ", 1)'
            )->execute(['hospital_id' => $hospitalId]);
            $branchId = (int) $pdo->lastInsertId();
        }

        $pdo->prepare(
            'INSERT INTO users (hospital_id, branch_id, username, full_name, email, phone, password_hash, role, status)
             VALUES (:hospital_id, :branch_id, :username, "Joseph", :email, NULL, :password_hash, "super_admin", "active")'
        )->execute([
            'hospital_id' => $hospitalId,
            'branch_id' => $branchId,
            'username' => $ownerUsername,
            'email' => $ownerEmail,
            'password_hash' => password_hash($ownerPassword, PASSWORD_DEFAULT),
        ]);

        $pdo->commit();
    } catch (Throwable $exception) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
    }
}

function logout_current_user(): void
{
    $_SESSION = [];

    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], (bool) $params['secure'], (bool) $params['httponly']);
    }

    session_destroy();
}

function can_access_all_branches(array $user): bool
{
    return in_array($user['role'], ['super_admin', 'hospital_admin', 'medical_director'], true);
}

function require_roles(array $user, array $roles): void
{
    if (!in_array($user['role'], $roles, true)) {
        json_response(['message' => 'Forbidden.'], 403);
    }
}

function scoped_where_clause(array $user, string $hospitalColumn = 'hospital_id', string $branchColumn = 'branch_id'): array
{
    $sql = " WHERE {$hospitalColumn} = :hospital_id";
    $params = ['hospital_id' => $user['hospital_id']];

    if (!can_access_all_branches($user) && !empty($user['branch_id'])) {
        $sql .= " AND {$branchColumn} = :branch_id";
        $params['branch_id'] = $user['branch_id'];
    }

    return [$sql, $params];
}

function slugify_code(string $value): string
{
    $value = strtolower(trim($value));
    $value = preg_replace('/[^a-z0-9]+/', '-', $value) ?? '';
    $value = trim($value, '-');

    return $value !== '' ? $value : 'hospital';
}
