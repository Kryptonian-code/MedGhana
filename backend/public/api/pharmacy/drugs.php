<?php
declare(strict_types=1);

require_once dirname(__DIR__, 4) . '/bootstrap.php';

request_method('POST');

$user = require_auth($pdo);
require_roles($user, ['super_admin', 'hospital_admin', 'pharmacist']);

$payload = request_body();
$name = trim((string) ($payload['name'] ?? ''));
$genericName = trim((string) ($payload['generic_name'] ?? ''));
$category = trim((string) ($payload['category'] ?? ''));
$dosageForm = trim((string) ($payload['dosage_form'] ?? ''));
$strength = trim((string) ($payload['strength'] ?? ''));
$unitPrice = (float) ($payload['unit_price'] ?? 0);
$stockQuantity = max(0, (int) ($payload['stock_quantity'] ?? 0));
$reorderLevel = max(0, (int) ($payload['reorder_level'] ?? 0));
$expiryDate = trim((string) ($payload['expiry_date'] ?? ''));
$batchNumber = trim((string) ($payload['batch_number'] ?? ''));
$supplier = trim((string) ($payload['supplier'] ?? ''));

if ($name === '' || $category === '' || $dosageForm === '') {
    json_response(['message' => 'Drug name, category, and dosage form are required.'], 422);
}

$pdo->prepare(
    'INSERT INTO drugs (
        hospital_id, branch_id, name, generic_name, category, dosage_form, strength, unit_price, stock_quantity, reorder_level, expiry_date, batch_number, supplier
    ) VALUES (
        :hospital_id, :branch_id, :name, :generic_name, :category, :dosage_form, :strength, :unit_price, :stock_quantity, :reorder_level, :expiry_date, :batch_number, :supplier
    )'
)->execute([
    'hospital_id' => $user['hospital_id'],
    'branch_id' => $user['branch_id'] ?: null,
    'name' => $name,
    'generic_name' => $genericName !== '' ? $genericName : null,
    'category' => $category,
    'dosage_form' => $dosageForm,
    'strength' => $strength !== '' ? $strength : null,
    'unit_price' => $unitPrice,
    'stock_quantity' => $stockQuantity,
    'reorder_level' => $reorderLevel,
    'expiry_date' => $expiryDate !== '' ? $expiryDate : null,
    'batch_number' => $batchNumber !== '' ? $batchNumber : null,
    'supplier' => $supplier !== '' ? $supplier : null,
]);

json_response(['message' => 'Drug added successfully.'], 201);
