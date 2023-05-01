<?php

use App\Http\Controllers\MainController;
use RTC\Http\Router\Route;

Route::get('/', [MainController::class, 'index']);
Route::get('/index.php', [MainController::class, 'index']);
