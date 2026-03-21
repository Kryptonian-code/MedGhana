<?php
declare(strict_types=1);

function normalize_ghana_phone(?string $phone): array
{
    $digits = digits_only($phone);

    if ($digits === '') {
        return [
            'success' => false,
            'error' => 'Phone number is empty.',
        ];
    }

    if (strlen($digits) === 10 && str_starts_with($digits, '0')) {
        return [
            'success' => true,
            'phone' => '233' . substr($digits, 1),
        ];
    }

    if (strlen($digits) === 12 && str_starts_with($digits, '233')) {
        return [
            'success' => true,
            'phone' => $digits,
        ];
    }

    return [
        'success' => false,
        'error' => 'Phone number could not be safely normalized as a Ghanaian number.',
    ];
}

function sms_provider_name(array $appConfig): string
{
    $provider = strtolower(trim((string) ($appConfig['sms_provider'] ?? '')));

    if ($provider !== '') {
        return $provider;
    }

    if (!empty($appConfig['bulkclix_api_key']) && !empty($appConfig['bulkclix_sender_id'])) {
        return 'bulkclix';
    }

    return 'disabled';
}

function sms_sending_enabled(array $appConfig): bool
{
    $provider = sms_provider_name($appConfig);

    if ($provider === 'log') {
        return true;
    }

    if ($provider === 'bulkclix') {
        return !empty($appConfig['bulkclix_api_key']) && !empty($appConfig['bulkclix_sender_id']);
    }

    return (bool) ($appConfig['sms_enabled'] ?? false) && $provider !== 'disabled';
}

function format_appointment_date(string $date): string
{
    try {
        return (new DateTimeImmutable($date))->format('D, j M Y');
    } catch (Throwable $exception) {
        return $date;
    }
}

function format_appointment_time(string $time): string
{
    try {
        return (new DateTimeImmutable($time))->format('g:i A');
    } catch (Throwable $exception) {
        return $time;
    }
}

function generate_appointment_reference(int $appointmentId, string $appointmentDate): string
{
    $safeDate = preg_replace('/\D+/', '', $appointmentDate) ?: date('Ymd');

    return sprintf('APT-%s-%06d', $safeDate, $appointmentId);
}

function calculate_reminder_due_at(string $appointmentDate, string $appointmentTime): string
{
    $appointmentDateTime = new DateTimeImmutable($appointmentDate . ' ' . $appointmentTime);

    return $appointmentDateTime->sub(new DateInterval('PT24H'))->format('Y-m-d H:i:s');
}

function build_appointment_sms_message(array $appointment, string $notificationType): string
{
    $patientName = trim((string) ($appointment['patient_name'] ?? 'Patient'));
    $doctorName = trim((string) ($appointment['doctor_name'] ?? 'Assigned doctor'));
    $departmentName = trim((string) ($appointment['department_name'] ?? 'General'));
    $appointmentDate = format_appointment_date((string) $appointment['appointment_date']);
    $appointmentTime = format_appointment_time((string) $appointment['appointment_time']);
    $reference = trim((string) ($appointment['reference_code'] ?? 'N/A'));

    if ($notificationType === 'reminder') {
        return sprintf(
            "Hello %s,\n\nThis is a reminder of your hospital appointment tomorrow.\n\nDoctor: %s\nDepartment: %s\nDate: %s\nTime: %s\nReference: %s\n\nPlease arrive on time.",
            $patientName,
            $doctorName,
            $departmentName,
            $appointmentDate,
            $appointmentTime,
            $reference
        );
    }

    return sprintf(
        "Hello %s,\n\nYour hospital appointment has been booked successfully.\n\nDoctor: %s\nDepartment: %s\nDate: %s\nTime: %s\nReference: %s\n\nPlease keep this message for your records.",
        $patientName,
        $doctorName,
        $departmentName,
        $appointmentDate,
        $appointmentTime,
        $reference
    );
}

function create_sms_message_attempt(PDO $pdo, array $appConfig, array $appointment, string $phoneNumber, string $message, string $notificationType, ?string $attemptType = null): int
{
    $statement = $pdo->prepare(
        'INSERT INTO sms_messages (
            hospital_id, branch_id, patient_id, appointment_id, phone_number, message, context, notification_type, provider, sender_id, status
        ) VALUES (
            :hospital_id, :branch_id, :patient_id, :appointment_id, :phone_number, :message, :context, :notification_type, :provider, :sender_id, "processing"
        )'
    );

    $provider = sms_provider_name($appConfig);
    $senderId = $provider === 'bulkclix'
        ? (($appConfig['bulkclix_sender_id'] ?? '') ?: null)
        : (($appConfig['sms_sender_id'] ?? '') ?: null);

    $statement->execute([
        'hospital_id' => $appointment['hospital_id'],
        'branch_id' => $appointment['branch_id'] ?: null,
        'patient_id' => $appointment['patient_id'] ?: null,
        'appointment_id' => $appointment['id'] ?: null,
        'phone_number' => $phoneNumber,
        'message' => $message,
        'context' => 'appointment_' . $notificationType,
        'notification_type' => $attemptType ?? $notificationType,
        'provider' => $provider,
        'sender_id' => $senderId,
    ]);

    return (int) $pdo->lastInsertId();
}

function mark_sms_message_attempt(PDO $pdo, int $smsMessageId, array $result): void
{
    $pdo->prepare(
        'UPDATE sms_messages
         SET status = :status,
             provider_reference = :provider_reference,
             error_message = :error_message,
             sent_at = CASE WHEN :status = "sent" THEN NOW() ELSE sent_at END
         WHERE id = :id'
    )->execute([
        'status' => $result['success'] ? 'sent' : 'failed',
        'provider_reference' => $result['campaign_id'] ?? $result['provider_reference'] ?? null,
        'error_message' => $result['success'] ? null : ($result['error'] ?? 'SMS delivery failed.'),
        'id' => $smsMessageId,
    ]);
}

function update_appointment_sms_status(PDO $pdo, int $appointmentId, string $notificationType, array $result): void
{
    if ($notificationType === 'reminder') {
        $pdo->prepare(
            'UPDATE appointments
             SET sms_reminder_sent = :sent,
                 sms_reminder_sent_at = CASE WHEN :sent = 1 THEN NOW() ELSE sms_reminder_sent_at END,
                 sms_reminder_status = :status,
                 sms_reminder_error = :error,
                 bulkclix_campaign_id = COALESCE(:campaign_id, bulkclix_campaign_id)
             WHERE id = :id'
        )->execute([
            'sent' => $result['success'] ? 1 : 0,
            'status' => $result['success'] ? 'sent' : 'failed',
            'error' => $result['success'] ? null : ($result['error'] ?? 'Reminder SMS failed.'),
            'campaign_id' => $result['campaign_id'] ?? null,
            'id' => $appointmentId,
        ]);

        return;
    }

    $pdo->prepare(
        'UPDATE appointments
         SET sms_booking_sent = :sent,
             sms_booking_sent_at = CASE WHEN :sent = 1 THEN NOW() ELSE sms_booking_sent_at END,
             sms_booking_status = :status,
             sms_booking_error = :error,
             bulkclix_campaign_id = COALESCE(:campaign_id, bulkclix_campaign_id)
         WHERE id = :id'
    )->execute([
        'sent' => $result['success'] ? 1 : 0,
        'status' => $result['success'] ? 'sent' : 'failed',
        'error' => $result['success'] ? null : ($result['error'] ?? 'Booking SMS failed.'),
        'campaign_id' => $result['campaign_id'] ?? null,
        'id' => $appointmentId,
    ]);
}

function mark_appointment_sms_skipped(PDO $pdo, int $appointmentId, string $notificationType, string $error): void
{
    $columnPrefix = $notificationType === 'reminder' ? 'sms_reminder' : 'sms_booking';

    $pdo->prepare(
        "UPDATE appointments
         SET {$columnPrefix}_sent = 0,
             {$columnPrefix}_status = 'skipped',
             {$columnPrefix}_error = :error
         WHERE id = :id"
    )->execute([
        'error' => $error,
        'id' => $appointmentId,
    ]);
}

function send_bulkclix_sms(array $appConfig, string $phone, string $message): array
{
    $apiKey = (string) ($appConfig['bulkclix_api_key'] ?? '');
    $senderId = (string) ($appConfig['bulkclix_sender_id'] ?? '');
    $url = (string) ($appConfig['bulkclix_api_url'] ?? 'https://api.bulkclix.com/api/v1/sms-api/send');

    if ($apiKey === '' || $senderId === '') {
        return [
            'success' => false,
            'error' => 'BulkClix credentials are missing.',
        ];
    }

    if (!function_exists('curl_init')) {
        return [
            'success' => false,
            'error' => 'PHP cURL extension is required for BulkClix SMS.',
        ];
    }

    $payload = json_encode([
        'sender_id' => $senderId,
        'message' => $message,
        'recipients' => [$phone],
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

    if ($payload === false) {
        return [
            'success' => false,
            'error' => 'Unable to encode SMS request payload.',
        ];
    }

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'x-api-key: ' . $apiKey,
        ],
        CURLOPT_POSTFIELDS => $payload,
    ]);

    $rawResponse = curl_exec($ch);
    $curlError = curl_error($ch);
    $statusCode = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);

    if ($rawResponse === false) {
        return [
            'success' => false,
            'error' => $curlError !== '' ? $curlError : 'BulkClix request failed.',
        ];
    }

    $decoded = json_decode($rawResponse, true);
    $campaignId = is_array($decoded) ? ($decoded['data']['campaign_id'] ?? null) : null;
    $messageText = is_array($decoded) ? ($decoded['message'] ?? null) : null;

    if ($statusCode < 200 || $statusCode >= 300) {
        return [
            'success' => false,
            'error' => sprintf('BulkClix returned HTTP %d%s', $statusCode, $messageText ? ': ' . $messageText : '.'),
        ];
    }

    if ($messageText !== 'Request Sent') {
        return [
            'success' => false,
            'error' => 'BulkClix did not confirm SMS acceptance.',
        ];
    }

    return [
        'success' => true,
        'campaign_id' => is_string($campaignId) ? $campaignId : null,
        'provider_reference' => is_string($campaignId) ? $campaignId : null,
        'response' => $decoded,
    ];
}

function deliver_sms_message(array $appConfig, array $message): array
{
    $provider = sms_provider_name($appConfig);

    if ($provider === 'log') {
        error_log(sprintf('[MedGhana SMS] %s :: %s', $message['phone_number'], $message['message']));

        return [
            'success' => true,
            'provider_reference' => 'log-' . ($message['id'] ?? 'sms') . '-' . time(),
        ];
    }

    if ($provider === 'bulkclix') {
        return send_bulkclix_sms($appConfig, (string) $message['phone_number'], (string) $message['message']);
    }

    return [
        'success' => false,
        'error' => 'SMS provider integration is not configured.',
    ];
}

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
        $pdo->prepare('UPDATE sms_messages SET status = "processing" WHERE id = :id')->execute(['id' => $message['id']]);

        $result = deliver_sms_message($appConfig, $message);
        mark_sms_message_attempt($pdo, (int) $message['id'], $result);

        if ($result['success']) {
            $sent++;
            continue;
        }

        $failed++;
    }

    return [
        'processed' => $processed,
        'sent' => $sent,
        'failed' => $failed,
    ];
}

function send_appointment_sms(PDO $pdo, array $appConfig, array $appointment, string $notificationType, ?string $attemptType = null): array
{
    $normalized = normalize_ghana_phone((string) ($appointment['phone'] ?? ''));

    if (!$normalized['success']) {
        $error = $normalized['error'] ?? 'Invalid phone number.';
        error_log(sprintf('[MedGhana SMS] Appointment %d %s skipped: %s', (int) $appointment['id'], $notificationType, $error));
        mark_appointment_sms_skipped($pdo, (int) $appointment['id'], $notificationType, $error);

        return [
            'success' => false,
            'error' => $error,
            'skipped' => true,
        ];
    }

    if (!sms_sending_enabled($appConfig)) {
        $error = 'SMS sending is disabled or not configured.';
        error_log(sprintf('[MedGhana SMS] Appointment %d %s skipped: %s', (int) $appointment['id'], $notificationType, $error));
        mark_appointment_sms_skipped($pdo, (int) $appointment['id'], $notificationType, $error);

        return [
            'success' => false,
            'error' => $error,
            'skipped' => true,
        ];
    }

    $message = build_appointment_sms_message($appointment, $notificationType);
    $smsMessageId = create_sms_message_attempt($pdo, $appConfig, $appointment, $normalized['phone'], $message, $notificationType, $attemptType);

    $result = deliver_sms_message($appConfig, [
        'id' => $smsMessageId,
        'phone_number' => $normalized['phone'],
        'message' => $message,
    ]);

    if (!$result['success']) {
        error_log(sprintf(
            '[MedGhana SMS] Appointment %d %s failed for %s: %s',
            (int) $appointment['id'],
            $notificationType,
            $normalized['phone'],
            $result['error'] ?? 'Unknown error'
        ));
    }

    mark_sms_message_attempt($pdo, $smsMessageId, $result);
    update_appointment_sms_status($pdo, (int) $appointment['id'], $notificationType, $result);

    return $result + [
        'sms_message_id' => $smsMessageId,
        'normalized_phone' => $normalized['phone'],
    ];
}

function fetch_appointment_for_sms(PDO $pdo, int $appointmentId, int $hospitalId): ?array
{
    $statement = $pdo->prepare(
        'SELECT
            a.*,
            p.phone,
            CONCAT(p.first_name, " ", p.last_name) AS patient_name,
            p.hospital_number
         FROM appointments a
         INNER JOIN patients p ON p.id = a.patient_id
         WHERE a.id = :id AND a.hospital_id = :hospital_id
         LIMIT 1'
    );
    $statement->execute([
        'id' => $appointmentId,
        'hospital_id' => $hospitalId,
    ]);

    $appointment = $statement->fetch();

    return $appointment ?: null;
}

function resend_appointment_booking_sms(PDO $pdo, array $appConfig, int $appointmentId, int $hospitalId): array
{
    $appointment = fetch_appointment_for_sms($pdo, $appointmentId, $hospitalId);

    if (!$appointment) {
        return [
            'success' => false,
            'error' => 'Appointment not found.',
        ];
    }

    return send_appointment_sms($pdo, $appConfig, $appointment, 'booking', 'manual_resend');
}

function process_appointment_reminders(PDO $pdo, array $appConfig, int $limit = 50): array
{
    $statement = $pdo->prepare(
        'SELECT
            a.*,
            p.phone,
            CONCAT(p.first_name, " ", p.last_name) AS patient_name,
            p.hospital_number
         FROM appointments a
         INNER JOIN patients p ON p.id = a.patient_id
         WHERE a.status = "scheduled"
           AND a.sms_reminder_sent = 0
           AND (a.sms_reminder_status = "pending" OR a.sms_reminder_status = "failed")
           AND a.sms_reminder_due_at IS NOT NULL
           AND a.sms_reminder_due_at <= NOW()
           AND TIMESTAMP(a.appointment_date, a.appointment_time) > NOW()
         ORDER BY a.sms_reminder_due_at ASC
         LIMIT ' . max(1, $limit)
    );
    $statement->execute();

    $appointments = $statement->fetchAll();
    $processed = 0;
    $sent = 0;
    $failed = 0;
    $skipped = 0;

    foreach ($appointments as $appointment) {
        $processed++;
        $result = send_appointment_sms($pdo, $appConfig, $appointment, 'reminder');

        if (!empty($result['success'])) {
            $sent++;
            continue;
        }

        if (!empty($result['skipped'])) {
            $skipped++;
            continue;
        }

        $failed++;
    }

    return [
        'processed' => $processed,
        'sent' => $sent,
        'failed' => $failed,
        'skipped' => $skipped,
    ];
}
