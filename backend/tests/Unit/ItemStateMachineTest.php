<?php

use App\Domain\ItemStateMachine;
use App\Enums\ItemStatus;
use App\Exceptions\InvalidTransitionException;

/**
 * @return list<array{0: ItemStatus, 1: ItemStatus}>
 */
function legalEdges(): array
{
    return [
        [ItemStatus::Pending, ItemStatus::Approved],
        [ItemStatus::Pending, ItemStatus::Rejected],
        [ItemStatus::Pending, ItemStatus::NeedsWork],
        [ItemStatus::Pending, ItemStatus::Cancelled],
        [ItemStatus::NeedsWork, ItemStatus::Pending],
    ];
}

it('allows only the documented edges', function (ItemStatus $from, ItemStatus $to) {
    $machine = new ItemStateMachine;
    $ok = collect(legalEdges())->contains(fn (array $edge) => $edge[0] === $from && $edge[1] === $to);

    expect($machine->allows($from, $to))->toBe($ok);

    if ($ok) {
        $machine->assertTransition($from, $to);
    } else {
        expect(fn () => $machine->assertTransition($from, $to))
            ->toThrow(InvalidTransitionException::class);
    }
})->with(function () {
    foreach (ItemStatus::cases() as $from) {
        foreach (ItemStatus::cases() as $to) {
            yield "{$from->value} → {$to->value}" => [$from, $to];
        }
    }
});

it('does not define an in_review status', function () {
    expect(ItemStatus::tryFrom('in_review'))->toBeNull();
});
