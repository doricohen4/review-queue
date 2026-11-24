<?php

namespace App\Exceptions;

use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use RuntimeException;

/** Submitter name does not match the item — not a status-machine problem. */
class CannotResubmitException extends RuntimeException
{
    public function __construct()
    {
        parent::__construct('Only the original submitter can resubmit this item.');
    }

    public function render(Request $request): never
    {
        throw ValidationException::withMessages([
            'submitter_name' => $this->getMessage(),
        ]);
    }
}
