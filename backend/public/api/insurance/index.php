<?php
declare(strict_types=1);

require_once dirname(__DIR__, 4) . '/bootstrap.php';

$user = require_auth($pdo);
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

if ($method === 'GET') {
    [$scopeSql, $params] = scoped_where_clause($user, 'c.hospital_id', 'c.branch_id');
    $statement = $pdo->prepare(
        'SELECT
            c.id,
            c.patient_id,
            c.invoice_id,
            c.nhis_number,
            c.service_description,
            c.amount,
            c.status,
            c.claim_date,
            c.notes,
            CONCAT(p.first_name, " ", p.last_name) AS patient_name
         FROM insurance_claims c
         INNER JOIN patients p ON p.id = c.patient_id
         ' . $scopeSql . '
         ORDER BY c.created_at DESC'
    );
    $statement->execute($params);
    [$invoiceScopeSql, $invoiceParams] = scoped_where_clause($user, 'i.hospital_id', 'i.branch_id');
    $invoiceStatement = $pdo->prepare(
        'SELECT
            i.id,
            i.patient_id,
            i.invoice_number,
            i.total_amount,
            i.balance,
            i.status,
            i.created_at,
            p.nhis_number,
            CONCAT(p.first_name, " ", p.last_name) AS patient_name
         FROM invoices i
         INNER JOIN patients p ON p.id = i.patient_id
         LEFT JOIN insurance_claims c ON c.invoice_id = i.id
         ' . $invoiceScopeSql . ' AND c.id IS NULL
         ORDER BY i.created_at DESC
         LIMIT 30'
    );
    $invoiceStatement->execute($invoiceParams);
    json_response([
        'claims' => $statement->fetchAll(),
        'claimable_invoices' => $invoiceStatement->fetchAll(),
    ]);
}

if ($method === 'POST') {
    require_roles($user, ['super_admin', 'hospital_admin', 'cashier', 'receptionist', 'records_officer']);
    $payload = request_body();
    $patientId = (int) ($payload['patient_id'] ?? 0);
    $invoiceId = isset($payload['invoice_id']) && $payload['invoice_id'] !== '' ? (int) ($payload['invoice_id']) : null;
    $nhisNumber = trim((string) ($payload['nhis_number'] ?? ''));
    $serviceDescription = trim((string) ($payload['service_description'] ?? ''));
    $amount = (float) ($payload['amount'] ?? 0);
    $claimDate = trim((string) ($payload['claim_date'] ?? date('Y-m-d')));
    $notes = trim((string) ($payload['notes'] ?? ''));

    if ($patientId <= 0 || $serviceDescription === '' || $amount <= 0) {
        json_response(['message' => 'Patient, service description, and amount are required.'], 422);
    }

    $pdo->prepare(
        'INSERT INTO insurance_claims (
            hospital_id, branch_id, patient_id, invoice_id, nhis_number, service_description, amount, status, claim_date, submitted_by, notes
        ) VALUES (
            :hospital_id, :branch_id, :patient_id, :invoice_id, :nhis_number, :service_description, :amount, "submitted", :claim_date, :submitted_by, :notes
        )'
    )->execute([
        'hospital_id' => $user['hospital_id'],
        'branch_id' => $user['branch_id'] ?: null,
        'patient_id' => $patientId,
        'invoice_id' => $invoiceId,
        'nhis_number' => $nhisNumber !== '' ? $nhisNumber : null,
        'service_description' => $serviceDescription,
        'amount' => $amount,
        'claim_date' => $claimDate,
        'submitted_by' => $user['id'],
        'notes' => $notes !== '' ? $notes : null,
    ]);

    json_response(['message' => 'Claim submitted successfully.'], 201);
}

json_response(['message' => 'Method not allowed.'], 405);
