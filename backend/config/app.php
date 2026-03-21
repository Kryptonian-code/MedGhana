<?php
declare(strict_types=1);

$frontendOrigins = getenv('HMS_FRONTEND_ORIGINS');

return [
    'frontend_origins' => $frontendOrigins
        ? array_map('trim', explode(',', $frontendOrigins))
        : [
            'http://localhost:8080',
            'http://127.0.0.1:8080',
            'http://localhost',
            'http://127.0.0.1',
        ],
    'session_name' => getenv('HMS_SESSION_NAME') ?: 'hms_session',
    'sms_enabled' => filter_var(getenv('HMS_SMS_ENABLED') ?: false, FILTER_VALIDATE_BOOL),
    'sms_provider' => getenv('HMS_SMS_PROVIDER') ?: '',
    'sms_sender_id' => getenv('HMS_SMS_SENDER_ID') ?: '',
    'sms_api_url' => getenv('HMS_SMS_API_URL') ?: '',
    'bulkclix_api_key' => getenv('BULKCLIX_API_KEY') ?: '',
    'bulkclix_sender_id' => getenv('BULKCLIX_SENDER_ID') ?: '',
    'bulkclix_api_url' => 'https://api.bulkclix.com/api/v1/sms-api/send',
];
