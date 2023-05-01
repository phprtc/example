<?php

namespace App\Http\Controllers;

use RTC\Contracts\Http\RequestInterface;
use RTC\Http\Controller;

class MainController extends Controller
{
    private string $htmlCode;


    public function __construct(RequestInterface $request)
    {
        parent::__construct($request);
        $this->htmlCode = file_get_contents(dirname(__DIR__, 3) . '/public/index.html');
    }

    public function index(): void
    {
        $this->response->cookie('ws_client_url', $_ENV['WS_CLIENT_URL']);
        $this->response->html($this->htmlCode);
    }
}