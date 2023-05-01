<?php

namespace App\Http;

use RTC\Contracts\Http\RequestInterface;
use RTC\Http\DefaultHttpHandler;
use RTC\Http\Router\Collector;

class Handler extends DefaultHttpHandler
{
    public function __construct()
    {
        $collector = Collector::create()
            ->collectFile(dirname(__DIR__, 2) . '/routes/web.php');

        $this->setRouteCollector($collector);
    }

    public function handle(RequestInterface $request): void
    {
        $request->getResponse()->html('Hello');
    }
}