<?php
declare(strict_types=1);

$appConfig = require __DIR__ . '/config/app.php';
$dbConfig = require __DIR__ . '/config/database.php';

require_once __DIR__ . '/lib/http.php';
require_once __DIR__ . '/lib/auth.php';
require_once __DIR__ . '/lib/admissions.php';
require_once __DIR__ . '/lib/audit.php';
require_once __DIR__ . '/lib/settings.php';
require_once __DIR__ . '/lib/workflow.php';
require_once __DIR__ . '/lib/sms.php';

configure_cors($appConfig);
start_api_session();

$dsn = sprintf(
    'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
    $dbConfig['host'],
    $dbConfig['port'],
    $dbConfig['name']
);

try {
    $pdo = new PDO($dsn, $dbConfig['user'], $dbConfig['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    ensure_owner_account($pdo);
} catch (PDOException $exception) {
    json_response([
        'message' => 'Database connection failed.',
        'error' => $exception->getMessage(),
    ], 500);
}
