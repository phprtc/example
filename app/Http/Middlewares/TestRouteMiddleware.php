<?php

namespace App\Http\Middlewares;

use RTC\Contracts\Http\RequestInterface;
use RTC\Http\Middleware;

class TestRouteMiddleware extends Middleware
{
    public function handle(RequestInterface $request): void
    {
        $request->getMiddleware()->next();
    }
}