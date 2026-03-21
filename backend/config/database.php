<?php
declare(strict_types=1);

return [
    'host' => getenv('HMS_DB_HOST') ?: '127.0.0.1',
    'port' => getenv('HMS_DB_PORT') ?: '3306',
    'name' => getenv('HMS_DB_NAME') ?: 'hms',
    'user' => getenv('HMS_DB_USER') ?: 'root',
    'password' => getenv('HMS_DB_PASSWORD') ?: '',
];
