<?php
declare(strict_types=1);

require_once dirname(__DIR__, 4) . '/bootstrap.php';

$user = require_auth($pdo);
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

if ($method === 'GET') {
    $sql = 'SELECT
                id,
                hospital_number,
                first_name,
                last_name,
                other_names,
                gender,
                date_of_birth,
                phone,
                email,
                address,
                town,
                district,
                region,
                national_id_type,
                national_id_number,
                nhis_number,
                nhis_expiry,
                insurance_type,
                blood_group,
                genotype,
                emergency_contact_name,
                emergency_contact_phone,
                next_of_kin_name,
                next_of_kin_phone,
                next_of_kin_relationship,
                created_at,
                updated_at
            FROM patients
            WHERE hospital_id = :hospital_id';

    $params = ['hospital_id' => $user['hospital_id']];

    if (!can_access_all_branches($user) && !empty($user['branch_id'])) {
        $sql .= ' AND branch_id = :branch_id';
        $params['branch_id'] = $user['branch_id'];
    }

    $sql .= ' ORDER BY created_at DESC';

    $statement = $pdo->prepare($sql);
    $statement->execute($params);

    json_response(['patients' => $statement->fetchAll()]);
}

if ($method === 'POST') {
    $payload = request_body();

    $firstName = trim((string) ($payload['first_name'] ?? ''));
    $lastName = trim((string) ($payload['last_name'] ?? ''));
    $gender = trim((string) ($payload['gender'] ?? ''));
    $dateOfBirth = trim((string) ($payload['date_of_birth'] ?? ''));
    $phone = validate_digits_phone((string) ($payload['phone'] ?? ''), true);

    if ($firstName === '' || $lastName === '' || $gender === '' || $dateOfBirth === '' || $phone === '') {
        json_response(['message' => 'First name, last name, gender, date of birth, and phone are required.'], 422);
    }

    if (!in_array($gender, ['male', 'female'], true)) {
        json_response(['message' => 'Gender must be male or female.'], 422);
    }

    $region = nullable_string($payload['region'] ?? null);
    if ($region !== null && !in_array($region, ghana_regions(), true)) {
        json_response(['message' => 'Please select a valid Ghana region.'], 422);
    }

    $nationalIdNumber = nullable_string($payload['national_id_number'] ?? null);
    $nhisNumber = nullable_string($payload['nhis_number'] ?? null);
    $otherNames = nullable_string($payload['other_names'] ?? null);

    $emergencyContactPhone = validate_digits_phone((string) ($payload['emergency_contact_phone'] ?? ''), false);
    $nextOfKinPhone = validate_digits_phone((string) ($payload['next_of_kin_phone'] ?? ''), false);

    $duplicateStatement = $pdo->prepare(
        'SELECT id, hospital_number, first_name, last_name, date_of_birth, phone
         FROM patients
         WHERE hospital_id = :hospital_id
           AND (
                (first_name = :first_name AND last_name = :last_name AND date_of_birth = :date_of_birth)
                OR (phone = :phone AND date_of_birth = :date_of_birth)
                OR (:nhis_number IS NOT NULL AND nhis_number = :nhis_number)
                OR (:national_id_number IS NOT NULL AND national_id_number = :national_id_number)
           )
         LIMIT 1'
    );
    $duplicateStatement->execute([
        'hospital_id' => $user['hospital_id'],
        'first_name' => $firstName,
        'last_name' => $lastName,
        'date_of_birth' => $dateOfBirth,
        'phone' => $phone,
        'nhis_number' => $nhisNumber,
        'national_id_number' => $nationalIdNumber,
    ]);
    $duplicatePatient = $duplicateStatement->fetch();

    if ($duplicatePatient) {
        json_response([
            'message' => sprintf(
                'Patient already exists as %s (%s).',
                trim($duplicatePatient['first_name'] . ' ' . $duplicatePatient['last_name']),
                $duplicatePatient['hospital_number']
            ),
            'existing_patient' => $duplicatePatient,
        ], 409);
    }

    $countStatement = $pdo->prepare('SELECT COUNT(*) FROM patients WHERE hospital_id = :hospital_id');
    $countStatement->execute(['hospital_id' => $user['hospital_id']]);
    $nextNumber = ((int) $countStatement->fetchColumn()) + 1;
    $hospitalNumber = sprintf('HMS-%s-%05d', date('Y'), $nextNumber);

    $insert = $pdo->prepare(
        'INSERT INTO patients (
            hospital_id,
            branch_id,
            hospital_number,
            first_name,
            last_name,
            other_names,
            gender,
            date_of_birth,
            phone,
            email,
            address,
            town,
            district,
            region,
            national_id_type,
            national_id_number,
            nhis_number,
            nhis_expiry,
            insurance_type,
            blood_group,
            genotype,
            emergency_contact_name,
            emergency_contact_phone,
            next_of_kin_name,
            next_of_kin_phone,
            next_of_kin_relationship
        ) VALUES (
            :hospital_id,
            :branch_id,
            :hospital_number,
            :first_name,
            :last_name,
            :other_names,
            :gender,
            :date_of_birth,
            :phone,
            :email,
            :address,
            :town,
            :district,
            :region,
            :national_id_type,
            :national_id_number,
            :nhis_number,
            :nhis_expiry,
            :insurance_type,
            :blood_group,
            :genotype,
            :emergency_contact_name,
            :emergency_contact_phone,
            :next_of_kin_name,
            :next_of_kin_phone,
            :next_of_kin_relationship
        )'
    );

    $insert->execute([
        'hospital_id' => $user['hospital_id'],
        'branch_id' => $user['branch_id'] ?: null,
        'hospital_number' => $hospitalNumber,
        'first_name' => $firstName,
        'last_name' => $lastName,
        'other_names' => $otherNames,
        'gender' => $gender,
        'date_of_birth' => $dateOfBirth,
        'phone' => $phone,
        'email' => nullable_string($payload['email'] ?? null),
        'address' => nullable_string($payload['address'] ?? null),
        'town' => nullable_string($payload['town'] ?? null),
        'district' => nullable_string($payload['district'] ?? null),
        'region' => $region,
        'national_id_type' => nullable_string($payload['national_id_type'] ?? null),
        'national_id_number' => $nationalIdNumber,
        'nhis_number' => $nhisNumber,
        'nhis_expiry' => nullable_string($payload['nhis_expiry'] ?? null),
        'insurance_type' => nullable_string($payload['insurance_type'] ?? null),
        'blood_group' => nullable_string($payload['blood_group'] ?? null),
        'genotype' => nullable_string($payload['genotype'] ?? null),
        'emergency_contact_name' => nullable_string($payload['emergency_contact_name'] ?? null),
        'emergency_contact_phone' => $emergencyContactPhone,
        'next_of_kin_name' => nullable_string($payload['next_of_kin_name'] ?? null),
        'next_of_kin_phone' => $nextOfKinPhone,
        'next_of_kin_relationship' => nullable_string($payload['next_of_kin_relationship'] ?? null),
    ]);

    $patientId = (int) $pdo->lastInsertId();
    $patientStatement = $pdo->prepare(
        'SELECT
            id,
            hospital_number,
            first_name,
            last_name,
            other_names,
            gender,
            date_of_birth,
            phone,
            email,
            address,
            town,
            district,
            region,
            national_id_type,
            national_id_number,
            nhis_number,
            nhis_expiry,
            insurance_type,
            blood_group,
            genotype,
            emergency_contact_name,
            emergency_contact_phone,
            next_of_kin_name,
            next_of_kin_phone,
            next_of_kin_relationship,
            created_at,
            updated_at
         FROM patients
         WHERE id = :id
         LIMIT 1'
    );
    $patientStatement->execute(['id' => $patientId]);

    json_response([
        'message' => 'Patient created successfully.',
        'patient' => $patientStatement->fetch(),
    ], 201);
}

json_response(['message' => 'Method not allowed.'], 405);

function nullable_string(mixed $value): ?string
{
    $trimmed = trim((string) $value);
    return $trimmed === '' ? null : $trimmed;
}
