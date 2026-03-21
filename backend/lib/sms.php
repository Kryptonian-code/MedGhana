<?php
declare(strict_types=1);

function process_sms_queue(PDO $pdo, array $appConfig, int $limit = 20): array
{
    $statement = $pdo->prepare(
        'SELECT id, phone_number, message, provider, sender_id
         FROM sms_messages
         WHERE status = "queued"
         ORDER BY created_at ASC
         LIMIT ' . max(1, $limit)
    );
    $statement->execute();

    $messages = $statement->fetchAll();
    $processed = 0;
    $sent = 0;
    $failed = 0;

    foreach ($messages as $message) {
        $processed++;
        $result = deliver_sms_message($appConfig, $message);

        if ($result['success']) {
            $pdo->prepare(
                'UPDATE sms_messages
                 SET status = "sent", provider_reference = :provider_reference, sent_at = NOW(), error_message = NULL
                 WHERE id = :id'
            )->execute([
                'provider_reference' => $result['provider_reference'],
                'id' => $message['id'],
            ]);
            $sent++;
            continue;
        }

        $pdo->prepare(
            'UPDATE sms_messages
             SET status = "failed", error_message = :error_message
             WHERE id = :id'
        )->execute([
            'error_message' => $result['error_message'],
            'id' => $message['id'],
        ]);
        $failed++;
    }

    return [
        'processed' => $processed,
        'sent' => $sent,
        'failed' => $failed,
    ];
}

function deliver_sms_message(array $appConfig, array $message): array
{
    $provider = strtolower((string) ($appConfig['sms_provider'] ?? ''));

    if ($provider === 'log') {
        error_log(sprintf('[MedGhana SMS] %s :: %s', $message['phone_number'], $message['message']));

        return [
            'success' => true,
            'provider_reference' => 'log-' . $message['id'] . '-' . time(),
        ];
    }

    return [
        'success' => false,
        'error_message' => 'SMS provider integration is not configured yet. Use HMS_SMS_PROVIDER=log for local verification or connect a live provider.',
    ];
}
