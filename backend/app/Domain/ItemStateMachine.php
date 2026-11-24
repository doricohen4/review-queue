<?php

namespace App\Domain;

use App\Enums\ItemStatus;
use App\Exceptions\InvalidTransitionException;

final class ItemStateMachine
{
    /**
     * The whole lifecycle in one place. If a move isn't listed, it's illegal.
     * Empty list = terminal (approved / rejected / cancelled) — can't reopen.
     * needs_work → pending is the only way back (submitter resubmits).
     *
     * @var array<string, list<string>>
     */
    private const TRANSITIONS = [
        ItemStatus::Pending->value => [
            ItemStatus::Approved->value,
            ItemStatus::Rejected->value,
            ItemStatus::NeedsWork->value,
            ItemStatus::Cancelled->value,
        ],
        ItemStatus::NeedsWork->value => [
            ItemStatus::Pending->value,
        ],
        ItemStatus::Approved->value => [],
        ItemStatus::Rejected->value => [],
        ItemStatus::Cancelled->value => [],
    ];

    public function assertTransition(ItemStatus $from, ItemStatus $to): void
    {
        $allowed = self::TRANSITIONS[$from->value] ?? [];

        if (! in_array($to->value, $allowed, true)) {
            throw new InvalidTransitionException($from, $to);
        }
    }
}
