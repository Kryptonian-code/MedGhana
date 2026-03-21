<?php
declare(strict_types=1);

require_once dirname(__DIR__, 4) . '/bootstrap.php';

request_method('GET');

$user = require_auth($pdo);
require_roles($user, ['super_admin']);

$stats = [
    'hospitals' => (int) $pdo->query('SELECT COUNT(*) FROM hospitals')->fetchColumn(),
    'branches' => (int) $pdo->query('SELECT COUNT(*) FROM branches')->fetchColumn(),
    'users' => (int) $pdo->query('SELECT COUNT(*) FROM users WHERE status = "active"')->fetchColumn(),
    'patients' => (int) $pdo->query('SELECT COUNT(*) FROM patients')->fetchColumn(),
    'queued_sms' => (int) $pdo->query('SELECT COUNT(*) FROM sms_messages WHERE status = "queued"')->fetchColumn(),
    'unread_notifications' => (int) $pdo->query('SELECT COUNT(*) FROM notifications WHERE is_read = 0')->fetchColumn(),
    'audit_events' => (int) $pdo->query('SELECT COUNT(*) FROM audit_logs')->fetchColumn(),
];

$hospitals = $pdo->query(
    'SELECT h.id, h.name, h.code, h.status, h.created_at,
            (SELECT COUNT(*) FROM branches b WHERE b.hospital_id = h.id) AS branch_count,
            (SELECT COUNT(*) FROM users u WHERE u.hospital_id = h.id AND u.status = "active") AS user_count,
            (SELECT COUNT(*) FROM patients p WHERE p.hospital_id = h.id) AS patient_count
     FROM hospitals h
     ORDER BY h.created_at DESC
     LIMIT 10'
)->fetchAll();

$recentSms = $pdo->query(
    'SELECT id, phone_number, context, status, created_at, sent_at
     FROM sms_messages
     ORDER BY created_at DESC
     LIMIT 8'
)->fetchAll();

$recentAudits = $pdo->query(
    'SELECT a.id, a.action, a.entity_type, a.entity_id, a.created_at, a.user_role, COALESCE(u.full_name, "System") AS full_name, h.name AS hospital_name
     FROM audit_logs a
     LEFT JOIN users u ON u.id = a.user_id
     LEFT JOIN hospitals h ON h.id = a.hospital_id
     ORDER BY a.created_at DESC
     LIMIT 8'
)->fetchAll();

json_response([
    'stats' => $stats,
    'hospitals' => $hospitals,
    'recent_sms' => $recentSms,
    'recent_audits' => $recentAudits,
]);
