<?php

namespace App\Domain;

use App\Enums\ItemStatus;
use App\Exceptions\InvalidTransitionException;

final class ItemStateMachine
{
    /**
     * The whole lifecycle in one place. If a move isn't listed, it's illegal.
     * Empty list = terminal (approved / rejected) — can't reopen.
     * needs_work → pending is the only way back (submitter resubmits).
     *
     * @var array<string, list<string>>
     */
    private const TRANSITIONS = [
        ItemStatus::Pending->value => [
            ItemStatus::Approved->value,
            ItemStatus::Rejected->value,
            ItemStatus::NeedsWork->value,
        ],
        ItemStatus::NeedsWork->value => [
            ItemStatus::Pending->value,
        ],
        ItemStatus::Approved->value => [],
        ItemStatus::Rejected->value => [],
    ];

    /** True if TRANSITIONS lists $to under $from. Empty list = terminal. */
    public function allows(ItemStatus $from, ItemStatus $to): bool
    {
        return in_array($to->value, self::TRANSITIONS[$from->value] ?? [], true);
    }

    /** Throw if $to is not in TRANSITIONS[$from] (empty list = terminal). */
    public function assertTransition(ItemStatus $from, ItemStatus $to): void
    {
        if (! $this->allows($from, $to)) {
            throw new InvalidTransitionException($from, $to);
        }
    }
}
