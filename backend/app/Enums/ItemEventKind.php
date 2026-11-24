<?php

namespace App\Enums;

/** History kinds. submitted = first POST; revised = PUT pending; resubmitted = POST reopen. */
enum ItemEventKind: string
{
    case Submitted = 'submitted';
    case Revised = 'revised';
    case Resubmitted = 'resubmitted';
    case Reviewed = 'reviewed';
}
