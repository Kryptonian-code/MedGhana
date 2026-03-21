<?php
declare(strict_types=1);

require_once dirname(__DIR__, 4) . '/bootstrap.php';

$user = require_auth($pdo);
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

if ($method === 'GET') {
    [$scopeSql, $params] = scoped_where_clause($user, 'v.hospital_id', 'v.branch_id');

    $pendingStatement = $pdo->prepare(
        'SELECT
            v.id,
            v.patient_id,
            v.visit_date,
            v.visit_time,
            v.source,
            v.status,
            v.queue_number,
            v.complaint,
            CONCAT(p.first_name, " ", p.last_name) AS patient_name,
            p.hospital_number,
            tr.temperature,
            tr.pulse,
            tr.bmi
         FROM visits v
         INNER JOIN patients p ON p.id = v.patient_id
         LEFT JOIN triage_records tr ON tr.visit_id = v.id
         ' . $scopeSql . ' AND v.status IN ("triaged", "in_consultation")
         ORDER BY v.visit_date DESC, v.visit_time DESC'
    );
    $pendingStatement->execute($params);

    [$consultationScopeSql, $consultationParams] = scoped_where_clause($user, 'c.hospital_id', 'c.branch_id');
    $consultationStatement = $pdo->prepare(
        'SELECT
            c.id,
            c.patient_id,
            c.visit_id,
            c.presenting_complaint,
            c.history_of_present_illness,
            c.examination_findings,
            c.diagnosis,
            c.icd_code,
            c.treatment_plan,
            c.notes,
            c.status,
            c.created_at,
            c.doctor_name,
            CONCAT(p.first_name, " ", p.last_name) AS patient_name,
            p.hospital_number,
            COUNT(DISTINCT pr.id) AS prescription_count,
            COUNT(DISTINCT lo.id) AS lab_order_count
         FROM consultations c
         INNER JOIN patients p ON p.id = c.patient_id
         LEFT JOIN prescriptions pr ON pr.consultation_id = c.id
         LEFT JOIN lab_orders lo ON lo.consultation_id = c.id
         ' . $consultationScopeSql . '
         GROUP BY
            c.id,
            c.patient_id,
            c.visit_id,
            c.presenting_complaint,
            c.history_of_present_illness,
            c.examination_findings,
            c.diagnosis,
            c.icd_code,
            c.treatment_plan,
            c.notes,
            c.status,
            c.created_at,
            c.doctor_name,
            p.first_name,
            p.last_name,
            p.hospital_number
         ORDER BY c.created_at DESC'
    );
    $consultationStatement->execute($consultationParams);

    json_response([
        'pending_visits' => $pendingStatement->fetchAll(),
        'consultations' => $consultationStatement->fetchAll(),
    ]);
}

if ($method === 'POST') {
    require_roles($user, ['super_admin', 'hospital_admin', 'medical_director', 'doctor']);
    $payload = request_body();

    $visitId = (int) ($payload['visit_id'] ?? 0);
    $patientId = (int) ($payload['patient_id'] ?? 0);
    $presentingComplaint = trim((string) ($payload['presenting_complaint'] ?? ''));
    $history = trim((string) ($payload['history_of_present_illness'] ?? ''));
    $exam = trim((string) ($payload['examination_findings'] ?? ''));
    $diagnosis = trim((string) ($payload['diagnosis'] ?? ''));
    $icdCode = trim((string) ($payload['icd_code'] ?? ''));
    $treatmentPlan = trim((string) ($payload['treatment_plan'] ?? ''));
    $notes = trim((string) ($payload['notes'] ?? ''));
    $prescriptions = is_array($payload['prescriptions'] ?? null) ? $payload['prescriptions'] : [];
    $labOrders = is_array($payload['lab_orders'] ?? null) ? $payload['lab_orders'] : [];

    if ($visitId <= 0 || $patientId <= 0 || $presentingComplaint === '' || $diagnosis === '') {
        json_response(['message' => 'Visit, patient, complaint, and diagnosis are required.'], 422);
    }

    $visitStatement = $pdo->prepare(
        'SELECT v.id, v.patient_id, p.hospital_number, p.first_name, p.last_name
         FROM visits v
         INNER JOIN patients p ON p.id = v.patient_id
         WHERE v.id = :visit_id AND v.patient_id = :patient_id AND v.hospital_id = :hospital_id
         LIMIT 1'
    );
    $visitStatement->execute([
        'visit_id' => $visitId,
        'patient_id' => $patientId,
        'hospital_id' => $user['hospital_id'],
    ]);
    $visit = $visitStatement->fetch();

    if (!$visit) {
        json_response(['message' => 'Visit not found.'], 404);
    }

    $pdo->beginTransaction();

    try {
        $createdPrescriptions = 0;
        $createdLabOrders = 0;
        $consultationInsert = $pdo->prepare(
            'INSERT INTO consultations (
                hospital_id, branch_id, patient_id, visit_id, doctor_id, doctor_name, presenting_complaint,
                history_of_present_illness, examination_findings, diagnosis, icd_code, treatment_plan, notes, status
            ) VALUES (
                :hospital_id, :branch_id, :patient_id, :visit_id, :doctor_id, :doctor_name, :presenting_complaint,
                :history_of_present_illness, :examination_findings, :diagnosis, :icd_code, :treatment_plan, :notes, "completed"
            )'
        );
        $consultationInsert->execute([
            'hospital_id' => $user['hospital_id'],
            'branch_id' => $user['branch_id'] ?: null,
            'patient_id' => $patientId,
            'visit_id' => $visitId,
            'doctor_id' => $user['id'],
            'doctor_name' => $user['full_name'],
            'presenting_complaint' => $presentingComplaint,
            'history_of_present_illness' => $history !== '' ? $history : null,
            'examination_findings' => $exam !== '' ? $exam : null,
            'diagnosis' => $diagnosis,
            'icd_code' => $icdCode !== '' ? $icdCode : null,
            'treatment_plan' => $treatmentPlan !== '' ? $treatmentPlan : null,
            'notes' => $notes !== '' ? $notes : null,
        ]);
        $consultationId = (int) $pdo->lastInsertId();

        $pdo->prepare('UPDATE visits SET status = "completed" WHERE id = :visit_id')->execute([
            'visit_id' => $visitId,
        ]);

        foreach ($prescriptions as $prescription) {
            $drugName = trim((string) ($prescription['drug_name'] ?? ''));
            $dosage = trim((string) ($prescription['dosage'] ?? ''));
            $frequency = trim((string) ($prescription['frequency'] ?? ''));
            $duration = trim((string) ($prescription['duration'] ?? ''));
            $quantity = max(1, (int) ($prescription['quantity'] ?? 1));
            $instructions = trim((string) ($prescription['instructions'] ?? ''));
            $drugId = isset($prescription['drug_id']) && $prescription['drug_id'] !== '' ? (int) ($prescription['drug_id']) : null;

            if ($drugName === '' || $dosage === '' || $frequency === '' || $duration === '') {
                continue;
            }

            $pdo->prepare(
                'INSERT INTO prescriptions (
                    hospital_id, branch_id, patient_id, doctor_id, consultation_id, drug_id, drug_name, dosage, frequency, duration, quantity, instructions, status
                ) VALUES (
                    :hospital_id, :branch_id, :patient_id, :doctor_id, :consultation_id, :drug_id, :drug_name, :dosage, :frequency, :duration, :quantity, :instructions, "pending"
                )'
            )->execute([
                'hospital_id' => $user['hospital_id'],
                'branch_id' => $user['branch_id'] ?: null,
                'patient_id' => $patientId,
                'doctor_id' => $user['id'],
                'consultation_id' => $consultationId,
                'drug_id' => $drugId,
                'drug_name' => $drugName,
                'dosage' => $dosage,
                'frequency' => $frequency,
                'duration' => $duration,
                'quantity' => $quantity,
                'instructions' => $instructions !== '' ? $instructions : null,
            ]);
            $createdPrescriptions++;
        }

        foreach ($labOrders as $labOrder) {
            $testName = trim((string) ($labOrder['test_name'] ?? ''));
            $testCategory = trim((string) ($labOrder['test_category'] ?? ''));
            $priority = trim((string) ($labOrder['priority'] ?? 'routine'));
            $sampleType = trim((string) ($labOrder['sample_type'] ?? ''));
            $clinicalNotes = trim((string) ($labOrder['clinical_notes'] ?? ''));

            if ($testName === '' || $testCategory === '') {
                continue;
            }

            $pdo->prepare(
                'INSERT INTO lab_orders (
                    hospital_id, branch_id, patient_id, doctor_id, consultation_id, test_name, test_category, priority, sample_type, clinical_notes, status
                ) VALUES (
                    :hospital_id, :branch_id, :patient_id, :doctor_id, :consultation_id, :test_name, :test_category, :priority, :sample_type, :clinical_notes, "ordered"
                )'
            )->execute([
                'hospital_id' => $user['hospital_id'],
                'branch_id' => $user['branch_id'] ?: null,
                'patient_id' => $patientId,
                'doctor_id' => $user['id'],
                'consultation_id' => $consultationId,
                'test_name' => $testName,
                'test_category' => $testCategory,
                'priority' => in_array($priority, ['routine', 'urgent', 'stat'], true) ? $priority : 'routine',
                'sample_type' => $sampleType !== '' ? $sampleType : null,
                'clinical_notes' => $clinicalNotes !== '' ? $clinicalNotes : null,
            ]);
            $createdLabOrders++;
        }

        $patientName = trim($visit['first_name'] . ' ' . $visit['last_name']);
        notify_roles($pdo, $user, ['cashier', 'records_officer'], [
            'patient_id' => $patientId,
            'type' => 'consultation_completed',
            'title' => 'Consultation completed',
            'message' => sprintf(
                '%s (%s) has completed consultation. Review billing and records updates.',
                $patientName,
                $visit['hospital_number']
            ),
            'link' => '/billing',
        ]);

        if ($createdPrescriptions > 0) {
            notify_roles($pdo, $user, ['pharmacist'], [
                'patient_id' => $patientId,
                'type' => 'pharmacy_queue',
                'title' => 'Prescription created from consultation',
                'message' => sprintf(
                    '%s (%s) has medication waiting for dispensing.',
                    $patientName,
                    $visit['hospital_number']
                ),
                'link' => '/pharmacy',
            ]);
        }

        if ($createdLabOrders > 0) {
            notify_roles($pdo, $user, ['lab_scientist'], [
                'patient_id' => $patientId,
                'type' => 'lab_queue',
                'title' => 'Lab order created from consultation',
                'message' => sprintf(
                    '%s (%s) has laboratory requests ready for processing.',
                    $patientName,
                    $visit['hospital_number']
                ),
                'link' => '/laboratory',
            ]);
        }

        record_audit_log($pdo, $user, 'consultation_completed', 'consultation', $consultationId, [
            'patient_id' => $patientId,
            'visit_id' => $visitId,
            'diagnosis' => $diagnosis,
            'prescription_count' => $createdPrescriptions,
            'lab_order_count' => $createdLabOrders,
        ]);

        $pdo->commit();
    } catch (Throwable $exception) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }

        json_response(['message' => 'Unable to save consultation.', 'error' => $exception->getMessage()], 500);
    }

    json_response(['message' => 'Consultation recorded successfully.'], 201);
}

json_response(['message' => 'Method not allowed.'], 405);
