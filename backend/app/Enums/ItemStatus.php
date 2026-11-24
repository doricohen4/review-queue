<?php

namespace App\Enums;

/**
 * Queue lifecycle. The brief's examples were pending vs reviewed /
 * approve vs reject — I split "reviewed" into two terminals and added
 * needs_work so send-back isn't the same as reject. No in_review here
 * (that's a later lock, not this timebox).
 */
enum ItemStatus: string
{
    case Pending = 'pending';
    case Approved = 'approved';
    case Rejected = 'rejected';
    case NeedsWork = 'needs_work';
}
