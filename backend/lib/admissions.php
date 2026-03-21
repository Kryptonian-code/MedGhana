<?php
declare(strict_types=1);

function ensure_default_wards(PDO $pdo, array $user): void
{
    $statement = $pdo->prepare('SELECT COUNT(*) FROM wards WHERE hospital_id = :hospital_id');
    $statement->execute(['hospital_id' => $user['hospital_id']]);

    if ((int) $statement->fetchColumn() > 0) {
        return;
    }

    $wards = [
        ['Male Medical Ward', 'general', 12],
        ['Female Medical Ward', 'general', 12],
        ['Maternity Ward', 'maternity', 8],
        ['Pediatric Ward', 'pediatric', 6],
        ['ICU', 'icu', 4],
        ['Private Ward', 'private', 6],
    ];

    $insert = $pdo->prepare(
        'INSERT INTO wards (hospital_id, branch_id, name, type, total_beds, occupied_beds)
         VALUES (:hospital_id, :branch_id, :name, :type, :total_beds, 0)'
    );

    foreach ($wards as [$name, $type, $totalBeds]) {
        $insert->execute([
            'hospital_id' => $user['hospital_id'],
            'branch_id' => $user['branch_id'] ?: null,
            'name' => $name,
            'type' => $type,
            'total_beds' => $totalBeds,
        ]);
    }
}
