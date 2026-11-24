<?php

use App\Http\Controllers\HealthController;
use App\Http\Controllers\ItemController;
use Illuminate\Support\Facades\Route;

Route::get('/health', HealthController::class);

Route::get('/items/filters', [ItemController::class, 'filters']);
Route::get('/items', [ItemController::class, 'index']);
