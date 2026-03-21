<?php
declare(strict_types=1);

require_once dirname(__DIR__, 4) . '/bootstrap.php';

request_method('POST');

$user = require_auth($pdo);
require_roles($user, ['super_admin', 'hospital_admin', 'lab_scientist']);

$payload = request_body();
$labOrderId = (int) ($payload['id'] ?? 0);
$status = trim((string) ($payload['status'] ?? ''));
$results = trim((string) ($payload['results'] ?? ''));
$resultNotes = trim((string) ($payload['result_notes'] ?? ''));

if ($labOrderId <= 0 || !in_array($status, ['sample_collected', 'processing', 'completed', 'cancelled'], true)) {
    json_response(['message' => 'Valid lab order id and status are required.'], 422);
}

$statement = $pdo->prepare(
    'SELECT l.*, p.first_name, p.last_name, p.hospital_number
     FROM lab_orders l
     INNER JOIN patients p ON p.id = l.patient_id
     WHERE l.id = :id AND l.hospital_id = :hospital_id LIMIT 1'
);
$statement->execute([
    'id' => $labOrderId,
    'hospital_id' => $user['hospital_id'],
]);
$labOrder = $statement->fetch();

if (!$labOrder) {
    json_response(['message' => 'Lab order not found.'], 404);
}

$pdo->prepare(
    'UPDATE lab_orders
     SET status = :status, results = :results, result_notes = :result_notes, approved_by = CASE WHEN :status = "completed" THEN :approved_by ELSE approved_by END
     WHERE id = :id'
)->execute([
    'status' => $status,
    'results' => $results !== '' ? $results : $labOrder['results'],
    'result_notes' => $resultNotes !== '' ? $resultNotes : $labOrder['result_notes'],
    'approved_by' => $user['id'],
    'id' => $labOrderId,
]);

if ($status === 'completed') {
    notify_roles($pdo, $user, ['doctor', 'medical_director'], [
        'patient_id' => $labOrder['patient_id'],
        'type' => 'lab_result_ready',
        'title' => 'Lab result ready',
        'message' => sprintf(
            '%s %s (%s) now has %s results ready for review.',
            $labOrder['first_name'],
            $labOrder['last_name'],
            $labOrder['hospital_number'],
            $labOrder['test_name']
        ),
        'link' => '/laboratory',
    ]);
}

record_audit_log($pdo, $user, 'lab_order_status_updated', 'lab_order', $labOrderId, [
    'patient_id' => (int) $labOrder['patient_id'],
    'status' => $status,
]);

json_response(['message' => 'Lab order updated successfully.']);
