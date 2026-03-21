<?php
declare(strict_types=1);

require_once dirname(__DIR__, 4) . '/bootstrap.php';

$user = require_auth($pdo);
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

if ($method === 'GET') {
    [$scopeSql, $params] = scoped_where_clause($user, 'i.hospital_id', 'i.branch_id');
    $statement = $pdo->prepare(
        'SELECT
            i.id,
            i.patient_id,
            i.invoice_number,
            i.total_amount,
            i.paid_amount,
            i.balance,
            i.status,
            i.payment_method,
            i.created_at,
            CONCAT(p.first_name, " ", p.last_name) AS patient_name
         FROM invoices i
         INNER JOIN patients p ON p.id = i.patient_id
         ' . $scopeSql . '
         ORDER BY i.created_at DESC'
    );
    $statement->execute($params);
    $invoices = $statement->fetchAll();

    foreach ($invoices as &$invoice) {
        $itemStatement = $pdo->prepare(
            'SELECT id, invoice_id, description, quantity, unit_price, total, category FROM invoice_items WHERE invoice_id = :invoice_id'
        );
        $itemStatement->execute(['invoice_id' => $invoice['id']]);
        $invoice['items'] = $itemStatement->fetchAll();
    }

    [$consultationScopeSql, $consultationParams] = scoped_where_clause($user, 'c.hospital_id', 'c.branch_id');
    $consultationStatement = $pdo->prepare(
        'SELECT
            c.id,
            c.visit_id,
            c.patient_id,
            c.diagnosis,
            c.treatment_plan,
            c.created_at,
            CONCAT(p.first_name, " ", p.last_name) AS patient_name,
            p.hospital_number
         FROM consultations c
         INNER JOIN patients p ON p.id = c.patient_id
         LEFT JOIN invoices i ON i.visit_id = c.visit_id
         ' . $consultationScopeSql . ' AND i.id IS NULL
         ORDER BY c.created_at DESC
         LIMIT 20'
    );
    $consultationStatement->execute($consultationParams);

    json_response([
        'invoices' => $invoices,
        'billable_consultations' => $consultationStatement->fetchAll(),
    ]);
}

if ($method === 'POST') {
    require_roles($user, ['super_admin', 'hospital_admin', 'cashier', 'receptionist']);
    $payload = request_body();

    $patientId = (int) ($payload['patient_id'] ?? 0);
    $items = $payload['items'] ?? [];
    $paymentMethod = trim((string) ($payload['payment_method'] ?? ''));
    $paidAmount = isset($payload['paid_amount']) && $payload['paid_amount'] !== '' ? (float) $payload['paid_amount'] : 0.0;
    $visitId = isset($payload['visit_id']) && $payload['visit_id'] !== '' ? (int) $payload['visit_id'] : null;
    $notes = trim((string) ($payload['notes'] ?? ''));

    if ($patientId <= 0 || !is_array($items) || count($items) === 0) {
        json_response(['message' => 'Patient and at least one invoice item are required.'], 422);
    }

    $normalizedItems = [];
    $totalAmount = 0.0;
    foreach ($items as $item) {
        $description = trim((string) ($item['description'] ?? ''));
        $quantity = (int) ($item['quantity'] ?? 0);
        $unitPrice = (float) ($item['unit_price'] ?? 0);
        $category = trim((string) ($item['category'] ?? 'other'));

        if ($description === '' || $quantity <= 0 || $unitPrice < 0) {
            continue;
        }

        $total = round($quantity * $unitPrice, 2);
        $totalAmount += $total;
        $normalizedItems[] = [
            'description' => $description,
            'quantity' => $quantity,
            'unit_price' => $unitPrice,
            'total' => $total,
            'category' => $category !== '' ? $category : 'other',
        ];
    }

    if (count($normalizedItems) === 0) {
        json_response(['message' => 'Valid invoice items are required.'], 422);
    }

    $paidAmount = min($paidAmount, $totalAmount);
    $balance = round($totalAmount - $paidAmount, 2);
    $status = $paidAmount <= 0 ? 'pending' : ($balance > 0 ? 'partial' : 'paid');

    $countStatement = $pdo->prepare('SELECT COUNT(*) FROM invoices WHERE hospital_id = :hospital_id');
    $countStatement->execute(['hospital_id' => $user['hospital_id']]);
    $nextNumber = ((int) $countStatement->fetchColumn()) + 1;
    $invoiceNumber = sprintf('INV-%s-%05d', date('Y'), $nextNumber);

    $pdo->beginTransaction();

    try {
        $pdo->prepare(
            'INSERT INTO invoices (
                hospital_id, branch_id, patient_id, visit_id, invoice_number, total_amount, paid_amount, balance, status, payment_method, notes, created_by
            ) VALUES (
                :hospital_id, :branch_id, :patient_id, :visit_id, :invoice_number, :total_amount, :paid_amount, :balance, :status, :payment_method, :notes, :created_by
            )'
        )->execute([
            'hospital_id' => $user['hospital_id'],
            'branch_id' => $user['branch_id'] ?: null,
            'patient_id' => $patientId,
            'visit_id' => $visitId,
            'invoice_number' => $invoiceNumber,
            'total_amount' => $totalAmount,
            'paid_amount' => $paidAmount,
            'balance' => $balance,
            'status' => $status,
            'payment_method' => $paymentMethod !== '' ? $paymentMethod : null,
            'notes' => $notes !== '' ? $notes : null,
            'created_by' => $user['id'],
        ]);

        $invoiceId = (int) $pdo->lastInsertId();

        $itemInsert = $pdo->prepare(
            'INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total, category)
             VALUES (:invoice_id, :description, :quantity, :unit_price, :total, :category)'
        );

        foreach ($normalizedItems as $item) {
            $itemInsert->execute([
                'invoice_id' => $invoiceId,
                'description' => $item['description'],
                'quantity' => $item['quantity'],
                'unit_price' => $item['unit_price'],
                'total' => $item['total'],
                'category' => $item['category'],
            ]);
        }

        $pdo->commit();
    } catch (Throwable $exception) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }

        json_response(['message' => 'Unable to create invoice.', 'error' => $exception->getMessage()], 500);
    }

    json_response(['message' => 'Invoice created successfully.'], 201);
}

json_response(['message' => 'Method not allowed.'], 405);
