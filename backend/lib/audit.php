<?php
declare(strict_types=1);

function record_audit_log(PDO $pdo, array $user, string $action, string $entityType, ?int $entityId = null, array $metadata = []): void
{
    $statement = $pdo->prepare(
        'INSERT INTO audit_logs (
            hospital_id, branch_id, user_id, user_role, action, entity_type, entity_id, metadata
        ) VALUES (
            :hospital_id, :branch_id, :user_id, :user_role, :action, :entity_type, :entity_id, :metadata
        )'
    );

    $statement->execute([
        'hospital_id' => $user['hospital_id'] ?? null,
        'branch_id' => $user['branch_id'] ?: null,
        'user_id' => $user['id'] ?? null,
        'user_role' => $user['role'] ?? null,
        'action' => $action,
        'entity_type' => $entityType,
        'entity_id' => $entityId,
        'metadata' => !empty($metadata) ? json_encode($metadata, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) : null,
    ]);
}
