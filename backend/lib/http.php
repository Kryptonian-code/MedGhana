<?php
declare(strict_types=1);

function configure_cors(array $appConfig): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $allowedOrigins = $appConfig['frontend_origins'] ?? [];

    if ($origin !== '' && in_array($origin, $allowedOrigins, true)) {
        header("Access-Control-Allow-Origin: {$origin}");
        header('Vary: Origin');
        header('Access-Control-Allow-Credentials: true');
    }

    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

function start_api_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    session_name(getenv('HMS_SESSION_NAME') ?: 'hms_session');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'domain' => '',
        'secure' => false,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);

    session_start();
}

function json_response(array $payload, int $statusCode = 200): void
{
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function request_body(): array
{
    $rawInput = file_get_contents('php://input') ?: '';

    if ($rawInput === '') {
        return [];
    }

    $decoded = json_decode($rawInput, true);

    if (!is_array($decoded)) {
        json_response(['message' => 'Invalid JSON payload.'], 422);
    }

    return $decoded;
}

function request_method(string $expectedMethod): void
{
    if (strtoupper($_SERVER['REQUEST_METHOD'] ?? '') !== strtoupper($expectedMethod)) {
        json_response(['message' => 'Method not allowed.'], 405);
    }
}

function digits_only(?string $value): string
{
    return preg_replace('/\D+/', '', (string) $value) ?? '';
}

function validate_digits_phone(?string $value, bool $required = false): ?string
{
    $digits = digits_only($value);

    if ($digits === '') {
        if ($required) {
            json_response(['message' => 'A valid phone number is required.'], 422);
        }

        return null;
    }

    if (strlen($digits) < 9 || strlen($digits) > 15) {
        json_response(['message' => 'Phone numbers must contain 9 to 15 digits.'], 422);
    }

    return $digits;
}

function ghana_regions(): array
{
    return [
        'Ahafo',
        'Ashanti',
        'Bono',
        'Bono East',
        'Central',
        'Eastern',
        'Greater Accra',
        'North East',
        'Northern',
        'Oti',
        'Savannah',
        'Upper East',
        'Upper West',
        'Volta',
        'Western',
        'Western North',
    ];
}
