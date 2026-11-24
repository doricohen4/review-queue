<?php

use App\Http\Controllers\HealthController;
use App\Http\Controllers\ItemController;
use Illuminate\Support\Facades\Route;

Route::get('/health', HealthController::class);

Route::get('/items/filters', [ItemController::class, 'filters']);
Route::post('/items/review', [ItemController::class, 'review']);
Route::post('/items/{item}/resubmit', [ItemController::class, 'resubmit']);
Route::put('/items/{item}', [ItemController::class, 'update']);
Route::get('/items/{item}/audit', [ItemController::class, 'audit']);
Route::get('/items/{item}', [ItemController::class, 'show']);
Route::get('/items', [ItemController::class, 'index']);
Route::post('/items', [ItemController::class, 'store']);
