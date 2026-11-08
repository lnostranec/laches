<?php
/**
 * Скопируйте этот файл в config.php и заполните значения.
 * config.php НЕ коммитится в git (см. .gitignore) и закрыт от доступа через .htaccess.
 */

return [
    // Токен от @BotFather
    'bot_token' => '123456789:AA...',

    // Кому слать заявки. Узнать chat_id: написать боту /start, затем открыть
    // https://api.telegram.org/bot<ТОКЕН>/getUpdates и взять message.chat.id
    // Можно указать несколько: ['111111111', '222222222']
    'chat_ids'  => ['000000000'],

    // Необязательно: прокси, если хостинг не достучится до api.telegram.org
    // Пример: 'socks5h://user:pass@host:1080'
    'proxy'     => '',
];
