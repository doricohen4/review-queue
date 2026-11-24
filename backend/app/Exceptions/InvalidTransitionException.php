<?php

namespace App\Exceptions;

use App\Enums\ItemStatus;
use RuntimeException;

/** Thrown when someone tries a move that isn't in TRANSITIONS — we never silently "fix" the status. */
class InvalidTransitionException extends RuntimeException
{
    /** Message includes both statuses so failed[] can show the illegal edge. */
    public function __construct(ItemStatus $from, ItemStatus $to)
    {
        parent::__construct("Invalid transition from {$from->value} to {$to->value}.");
    }
}
