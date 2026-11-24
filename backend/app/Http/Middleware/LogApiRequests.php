<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

final class LogApiRequests
{
    /** Local only: method, URL, status, and decoded JSON body (storage/logs/laravel.log). */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if (! app()->isLocal()) {
            return $response;
        }

        $content = $response->getContent();
        $decoded = is_string($content) ? json_decode($content, true) : null;

        Log::debug('api.response', [
            'method' => $request->method(),
            'url' => $request->fullUrl(),
            'status' => $response->getStatusCode(),
            'body' => $decoded ?? $content,
        ]);

        return $response;
    }
}
