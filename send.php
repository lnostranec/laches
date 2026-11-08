<?php
/**
 * Приём заявки с сайта и отправка её в Telegram-бота.
 * Токен и chat_id лежат в config.php (не в репозитории, см. config.example.php).
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function respond(int $code, array $body): void
{
    http_response_code($code);
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['ok' => false, 'error' => 'Method not allowed']);
}

$configFile = __DIR__ . '/config.php';
if (!is_file($configFile)) {
    respond(500, ['ok' => false, 'error' => 'Server is not configured']);
}
$config = require $configFile;

$input = json_decode((string) file_get_contents('php://input'), true);
if (!is_array($input)) {
    $input = $_POST;
}

// Ловушка для ботов: людям поле не видно, бот его заполнит.
if (!empty($input['website'])) {
    respond(200, ['ok' => true]);
}

$clean = static function ($value, int $max): string {
    $value = trim(preg_replace('/\s+/u', ' ', (string) $value) ?? '');
    return mb_substr($value, 0, $max);
};

$name    = $clean($input['name'] ?? '', 60);
$comment = trim(mb_substr((string) ($input['comment'] ?? ''), 0, 1000));
$digits  = preg_replace('/\D/', '', (string) ($input['phone'] ?? '')) ?? '';
if (strlen($digits) === 11 && $digits[0] === '8') {
    $digits = '7' . substr($digits, 1);
}

if (mb_strlen($name) < 2 || strlen($digits) !== 11) {
    respond(422, ['ok' => false, 'error' => 'Invalid name or phone']);
}

// Простое ограничение частоты: не чаще одной заявки в 30 секунд с одного IP.
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$lockFile = sys_get_temp_dir() . '/hair_form_' . md5($ip);
if (is_file($lockFile) && time() - (int) filemtime($lockFile) < 30) {
    respond(429, ['ok' => false, 'error' => 'Too many requests']);
}

$phone = sprintf('+7 (%s) %s-%s-%s',
    substr($digits, 1, 3), substr($digits, 4, 3), substr($digits, 7, 2), substr($digits, 9, 2));

$e = static fn(string $s): string => htmlspecialchars($s, ENT_QUOTES | ENT_HTML5, 'UTF-8');

$text = "<b>Новая заявка с сайта</b>\n\n"
      . "👤 <b>Имя:</b> " . $e($name) . "\n"
      . "📞 <b>Телефон:</b> <a href=\"tel:+{$digits}\">" . $e($phone) . "</a>\n"
      . ($comment !== '' ? "💬 <b>Комментарий:</b>\n" . $e($comment) . "\n" : '')
      . "\n🕒 " . date('d.m.Y H:i');

$chatIds = (array) $config['chat_ids'];
$sent = 0;

foreach ($chatIds as $chatId) {
    $ch = curl_init('https://api.telegram.org/bot' . $config['bot_token'] . '/sendMessage');
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => http_build_query([
            'chat_id'                  => $chatId,
            'text'                     => $text,
            'parse_mode'               => 'HTML',
            'disable_web_page_preview' => true,
        ]),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT        => 10,
    ]);
    // Если хостинг не достучится до api.telegram.org, можно указать прокси в config.php.
    if (!empty($config['proxy'])) {
        curl_setopt($ch, CURLOPT_PROXY, $config['proxy']);
    }

    $response = curl_exec($ch);
    $result = is_string($response) ? json_decode($response, true) : null;
    if (!empty($result['ok'])) {
        $sent++;
    } else {
        error_log('Telegram send failed: ' . (is_string($response) ? $response : curl_error($ch)));
    }
}

if ($sent === 0) {
    respond(502, ['ok' => false, 'error' => 'Failed to deliver message']);
}

@touch($lockFile);
respond(200, ['ok' => true]);
