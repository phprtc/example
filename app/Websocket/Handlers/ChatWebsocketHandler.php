<?php

namespace App\Websocket\Handlers;

use RTC\Console\Console;
use RTC\Contracts\Server\ServerInterface;
use RTC\Contracts\Websocket\ConnectionInterface;
use RTC\Contracts\Websocket\EventInterface;
use RTC\Contracts\Websocket\FrameInterface;
use RTC\Contracts\Websocket\RoomInterface;
use RTC\Websocket\WebsocketHandler;
use Throwable;

class ChatWebsocketHandler extends WebsocketHandler
{
    protected Console $console;
    private string $startDate;


    public function __construct(ServerInterface $server, int $size = 2048)
    {
        parent::__construct($server, $size);

        $this->startDate = date('Y-m-d H:i:s');
        $this->console = new Console();
        $this->console->setPrefix('[WS Chat] ');
    }

    public function onEvent(ConnectionInterface $connection, EventInterface $event): void
    {
        $this->console->comment("Event: {$event->getName()} -> {$event->getFrame()->getRaw()}");
    }

    public function onMessage(ConnectionInterface $connection, FrameInterface $frame): void
    {
    }

    /**
     * @param ConnectionInterface $connection
     * @return void
     */
    public function onOpen(ConnectionInterface $connection): void
    {
        $this->addConnection($connection);

        $connection->send(
            event: 'welcome',
            data: [
                'message' => sprintf('Welcome,<br/>This server has been running since <b>%s</b>.', $this->startDate)
            ]
        );

        $this->console->info("Connection opened: {$connection->getIdentifier()}");
    }

    public function onClose(ConnectionInterface $connection): void
    {
        $this->console->writeln("Connection closed: {$connection->getIdentifier()}");
    }

    public function onError(ConnectionInterface $connection, Throwable $exception): void
    {
        $this->console->error("Error: {$connection->getIdentifier()} \n Exception: $exception");
    }
}