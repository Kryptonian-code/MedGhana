<?php
declare(strict_types=1);

function ensure_default_hospital_settings(PDO $pdo, array $user): void
{
    $statement = $pdo->prepare(
        'SELECT id FROM hospital_settings WHERE hospital_id = :hospital_id AND (branch_id <=> :branch_id) LIMIT 1'
    );
    $statement->execute([
        'hospital_id' => $user['hospital_id'],
        'branch_id' => $user['branch_id'] ?: null,
    ]);

    if ($statement->fetch()) {
        return;
    }

    $hospitalStatement = $pdo->prepare('SELECT name, email, phone, address FROM hospitals WHERE id = :id LIMIT 1');
    $hospitalStatement->execute(['id' => $user['hospital_id']]);
    $hospital = $hospitalStatement->fetch();

    if (!$hospital) {
        return;
    }

    $pdo->prepare(
        'INSERT INTO hospital_settings (
            hospital_id, branch_id, hospital_name, phone, email, address
        ) VALUES (
            :hospital_id, :branch_id, :hospital_name, :phone, :email, :address
        )'
    )->execute([
        'hospital_id' => $user['hospital_id'],
        'branch_id' => $user['branch_id'] ?: null,
        'hospital_name' => $hospital['name'],
        'phone' => $hospital['phone'],
        'email' => $hospital['email'],
        'address' => $hospital['address'],
    ]);
}
