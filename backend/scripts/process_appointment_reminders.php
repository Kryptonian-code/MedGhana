<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

$result = process_appointment_reminders($pdo, $appConfig, 100);

echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
