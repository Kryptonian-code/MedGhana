<?php
declare(strict_types=1);

require_once dirname(__DIR__, 3) . '/bootstrap.php';

request_method('POST');

logout_current_user();

json_response(['message' => 'Logged out.']);
