<?php

use App\Http\Kernel as HttpKernel;
use App\Websocket\Kernel as WSKernel;
use Dotenv\Dotenv;
use RTC\Server\Server;
use RTC\Watcher\Watcher;

require __DIR__ . '/vendor/autoload.php';

$env = Dotenv::createImmutable(__DIR__)->load();

try {
    $server = Server::create($env['SERVER_HOST'], $env['SERVER_PORT'])
        ->setDocumentRoot(__DIR__ . '/public')
        ->setPidFile(__DIR__ . '/.pid')
        ->setHttpKernel(HttpKernel::class)
        ->setWebsocketKernel(WSKernel::class)
        ->onStart(function (\Swoole\Http\Server $server) use ($env) {

            // Monitor filesystem changes for hot code reloading
            if ('development' == strtolower($env['APP_ENV'])) {
                Watcher::create()
                    ->addPath(__DIR__ . '/app')
                    ->addPath(__DIR__ . '/routes')
                    ->addPath(__DIR__ . '/vendor')
                    ->onChange(fn() => $server->reload())
                    ->start();
            }

            echo "Server started at http://$server->host:$server->port\n";
        });

    $server->setLogOption(
        filePath: __DIR__ . '/storage/logs/phprtc.log',
    );

    if ('true' == $env['SERVER_DAEMONIZE']) {
        $server->daemonize();
    }

    $server->run();
} catch (Throwable $e) {
    console()->error($e);
}