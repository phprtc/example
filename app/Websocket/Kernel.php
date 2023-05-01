<?php

namespace App\Websocket;

use App\Websocket\Handlers\ChatWebsocketHandler;

class Kernel extends \RTC\Websocket\Kernel
{
    protected array $handlers = [
        '/ws/chat' => ChatWebsocketHandler::class
    ];
}