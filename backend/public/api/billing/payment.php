<?php
declare(strict_types=1);

require_once dirname(__DIR__, 4) . '/bootstrap.php';

request_method('POST');

$user = require_auth($pdo);
require_roles($user, ['super_admin', 'hospital_admin', 'cashier']);

$payload = request_body();
$invoiceId = (int) ($payload['id'] ?? 0);
$amount = isset($payload['amount']) ? (float) $payload['amount'] : 0.0;
$paymentMethod = trim((string) ($payload['payment_method'] ?? ''));

if ($invoiceId <= 0 || $amount <= 0) {
    json_response(['message' => 'Invoice and payment amount are required.'], 422);
}

$statement = $pdo->prepare('SELECT * FROM invoices WHERE id = :id AND hospital_id = :hospital_id LIMIT 1');
$statement->execute([
    'id' => $invoiceId,
    'hospital_id' => $user['hospital_id'],
]);
$invoice = $statement->fetch();

if (!$invoice) {
    json_response(['message' => 'Invoice not found.'], 404);
}

$newPaid = min((float) $invoice['paid_amount'] + $amount, (float) $invoice['total_amount']);
$newBalance = round((float) $invoice['total_amount'] - $newPaid, 2);
$status = $newPaid <= 0 ? 'pending' : ($newBalance > 0 ? 'partial' : 'paid');

$pdo->prepare(
    'UPDATE invoices SET paid_amount = :paid_amount, balance = :balance, status = :status, payment_method = :payment_method WHERE id = :id'
)->execute([
    'paid_amount' => $newPaid,
    'balance' => $newBalance,
    'status' => $status,
    'payment_method' => $paymentMethod !== '' ? $paymentMethod : $invoice['payment_method'],
    'id' => $invoiceId,
]);

json_response(['message' => 'Payment applied successfully.']);
