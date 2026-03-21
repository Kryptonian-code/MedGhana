<?php
declare(strict_types=1);

require_once dirname(__DIR__, 4) . '/bootstrap.php';

request_method('GET');

$user = require_auth($pdo);

[$patientScopeSql, $patientParams] = scoped_where_clause($user, 'p.hospital_id', 'p.branch_id');
[$appointmentScopeSql, $appointmentParams] = scoped_where_clause($user, 'a.hospital_id', 'a.branch_id');
[$visitScopeSql, $visitParams] = scoped_where_clause($user, 'v.hospital_id', 'v.branch_id');
[$billingScopeSql, $billingParams] = scoped_where_clause($user, 'i.hospital_id', 'i.branch_id');

$today = date('Y-m-d');

$patientsToday = fetch_count(
    $pdo,
    'SELECT COUNT(*) FROM patients p ' . $patientScopeSql . ' AND DATE(p.created_at) = :today',
    array_merge($patientParams, ['today' => $today])
);

$appointmentsToday = fetch_count(
    $pdo,
    'SELECT COUNT(*) FROM appointments a ' . $appointmentScopeSql . ' AND a.appointment_date = :today',
    array_merge($appointmentParams, ['today' => $today])
);

$waitingTriage = fetch_count(
    $pdo,
    'SELECT COUNT(*) FROM visits v ' . $visitScopeSql . ' AND v.status IN ("waiting_triage", "in_triage")',
    $visitParams
);

$readyForConsultation = fetch_count(
    $pdo,
    'SELECT COUNT(*) FROM visits v ' . $visitScopeSql . ' AND v.status IN ("triaged", "in_consultation")',
    $visitParams
);

$pendingBills = fetch_count(
    $pdo,
    'SELECT COUNT(*) FROM invoices i ' . $billingScopeSql . ' AND i.balance > 0',
    $billingParams
);

$revenueToday = fetch_sum(
    $pdo,
    'SELECT COALESCE(SUM(i.paid_amount), 0) FROM invoices i ' . $billingScopeSql . ' AND DATE(i.updated_at) = :today',
    array_merge($billingParams, ['today' => $today])
);

$notificationParams = [
    'hospital_id' => $user['hospital_id'],
    'role_target' => $user['role'],
    'user_id' => $user['id'],
];
$notificationSql = 'SELECT id, type, title, message, link, is_read, created_at
    FROM notifications
    WHERE hospital_id = :hospital_id
      AND (role_target = :role_target OR user_id = :user_id OR (role_target IS NULL AND user_id IS NULL))';

if (!can_access_all_branches($user) && !empty($user['branch_id'])) {
    $notificationSql .= ' AND branch_id = :branch_id';
    $notificationParams['branch_id'] = $user['branch_id'];
}

$notificationSql .= ' ORDER BY created_at DESC LIMIT 6';

$notificationsStatement = $pdo->prepare($notificationSql);
$notificationsStatement->execute($notificationParams);

json_response([
    'stats' => [
        'patients_today' => $patientsToday,
        'appointments_today' => $appointmentsToday,
        'waiting_triage' => $waitingTriage,
        'ready_for_consultation' => $readyForConsultation,
        'pending_bills' => $pendingBills,
        'revenue_today' => (float) $revenueToday,
    ],
    'notifications' => $notificationsStatement->fetchAll(),
]);

function fetch_count(PDO $pdo, string $sql, array $params): int
{
    $statement = $pdo->prepare($sql);
    $statement->execute($params);
    return (int) $statement->fetchColumn();
}

function fetch_sum(PDO $pdo, string $sql, array $params): float
{
    $statement = $pdo->prepare($sql);
    $statement->execute($params);
    return (float) $statement->fetchColumn();
}
