<?php

namespace App\Exceptions;

use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use RuntimeException;

/** PUT is in-place pending edit. Reopening needs_work is POST resubmit. */
class CannotReviseException extends RuntimeException
{
    public function __construct()
    {
        parent::__construct(
            'Pending copy is updated with PUT. Send needs_work back with POST /api/items/{id}/resubmit.',
        );
    }

    public function render(Request $request): never
    {
        throw ValidationException::withMessages([
            'status' => $this->getMessage(),
        ]);
    }
}
