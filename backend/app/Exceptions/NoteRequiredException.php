<?php

namespace App\Exceptions;

use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use RuntimeException;

/** needs_work is not a silent reject — the reviewer must leave a note. */
class NoteRequiredException extends RuntimeException
{
    public function __construct()
    {
        parent::__construct('A note is required when sending an item back for work.');
    }

    public function render(Request $request): never
    {
        throw ValidationException::withMessages([
            'note' => $this->getMessage(),
        ]);
    }
}
