<?php
declare(strict_types=1);

require_once dirname(__DIR__, 4) . '/bootstrap.php';

$user = require_auth($pdo);
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

ensure_default_wards($pdo, $user);

if ($method === 'GET') {
    [$wardScopeSql, $wardParams] = scoped_where_clause($user, 'w.hospital_id', 'w.branch_id');
    $wardsStatement = $pdo->prepare(
        'SELECT
            w.id,
            w.name,
            w.type,
            w.total_beds,
            w.occupied_beds,
            (w.total_beds - w.occupied_beds) AS available_beds
         FROM wards w
         ' . $wardScopeSql . '
         ORDER BY w.name ASC'
    );
    $wardsStatement->execute($wardParams);

    [$admissionScopeSql, $admissionParams] = scoped_where_clause($user, 'a.hospital_id', 'a.branch_id');
    $admissionsStatement = $pdo->prepare(
        'SELECT
            a.id,
            a.patient_id,
            a.ward_id,
            a.bed_number,
            a.admission_date,
            a.discharge_date,
            a.reason,
            a.status,
            CONCAT(p.first_name, " ", p.last_name) AS patient_name,
            p.hospital_number,
            w.name AS ward_name
         FROM admissions a
         INNER JOIN patients p ON p.id = a.patient_id
         INNER JOIN wards w ON w.id = a.ward_id
         ' . $admissionScopeSql . '
         ORDER BY a.created_at DESC'
    );
    $admissionsStatement->execute($admissionParams);

    json_response([
        'wards' => $wardsStatement->fetchAll(),
        'admissions' => $admissionsStatement->fetchAll(),
    ]);
}

if ($method === 'POST') {
    require_roles($user, ['super_admin', 'hospital_admin', 'medical_director', 'doctor', 'nurse', 'receptionist']);
    $payload = request_body();

    $patientId = (int) ($payload['patient_id'] ?? 0);
    $wardId = (int) ($payload['ward_id'] ?? 0);
    $bedNumber = trim((string) ($payload['bed_number'] ?? ''));
    $admissionDate = trim((string) ($payload['admission_date'] ?? ''));
    $reason = trim((string) ($payload['reason'] ?? ''));

    if ($patientId <= 0 || $wardId <= 0 || $bedNumber === '' || $admissionDate === '' || $reason === '') {
        json_response(['message' => 'Patient, ward, bed number, admission date, and reason are required.'], 422);
    }

    $wardStatement = $pdo->prepare(
        'SELECT id, name, total_beds, occupied_beds
         FROM wards
         WHERE id = :id AND hospital_id = :hospital_id
         LIMIT 1'
    );
    $wardStatement->execute([
        'id' => $wardId,
        'hospital_id' => $user['hospital_id'],
    ]);
    $ward = $wardStatement->fetch();

    if (!$ward) {
        json_response(['message' => 'Ward not found.'], 404);
    }

    if ((int) $ward['occupied_beds'] >= (int) $ward['total_beds']) {
        json_response(['message' => 'That ward has no available beds.'], 422);
    }

    $patientStatement = $pdo->prepare('SELECT first_name, last_name, hospital_number FROM patients WHERE id = :id LIMIT 1');
    $patientStatement->execute(['id' => $patientId]);
    $patient = $patientStatement->fetch();
    if (!$patient) {
        json_response(['message' => 'Patient not found.'], 404);
    }

    $pdo->beginTransaction();
    try {
        $pdo->prepare(
            'INSERT INTO admissions (
                hospital_id, branch_id, patient_id, ward_id, bed_number, admission_date, reason, status, admitted_by
            ) VALUES (
                :hospital_id, :branch_id, :patient_id, :ward_id, :bed_number, :admission_date, :reason, "admitted", :admitted_by
            )'
        )->execute([
            'hospital_id' => $user['hospital_id'],
            'branch_id' => $user['branch_id'] ?: null,
            'patient_id' => $patientId,
            'ward_id' => $wardId,
            'bed_number' => $bedNumber,
            'admission_date' => $admissionDate,
            'reason' => $reason,
            'admitted_by' => $user['id'],
        ]);

        $pdo->prepare('UPDATE wards SET occupied_beds = occupied_beds + 1 WHERE id = :id')->execute(['id' => $wardId]);

        notify_roles($pdo, $user, ['nurse', 'records_officer'], [
            'patient_id' => $patientId,
            'type' => 'patient_admitted',
            'title' => 'Patient admitted',
            'message' => sprintf(
                '%s %s (%s) has been admitted to %s, bed %s.',
                $patient['first_name'],
                $patient['last_name'],
                $patient['hospital_number'],
                $ward['name'],
                $bedNumber
            ),
            'link' => '/admissions',
        ]);

        $pdo->commit();
    } catch (Throwable $exception) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        json_response(['message' => 'Unable to admit patient.', 'error' => $exception->getMessage()], 500);
    }

    json_response(['message' => 'Admission recorded successfully.'], 201);
}

json_response(['message' => 'Method not allowed.'], 405);
