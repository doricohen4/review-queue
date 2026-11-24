<?php

use App\Domain\ItemStateMachine;
use App\Enums\ItemStatus;
use App\Exceptions\InvalidTransitionException;

it('allows pending to approved', function () {
    $machine = new ItemStateMachine;

    expect(fn () => $machine->assertTransition(ItemStatus::Pending, ItemStatus::Approved))
        ->not->toThrow(InvalidTransitionException::class);
});

it('rejects approved back to pending', function () {
    $machine = new ItemStateMachine;

    $machine->assertTransition(ItemStatus::Approved, ItemStatus::Pending);
})->throws(InvalidTransitionException::class);

it('allows pending to needs_work and needs_work back to pending', function () {
    $machine = new ItemStateMachine;

    expect(fn () => $machine->assertTransition(ItemStatus::Pending, ItemStatus::NeedsWork))
        ->not->toThrow(InvalidTransitionException::class);
    expect(fn () => $machine->assertTransition(ItemStatus::NeedsWork, ItemStatus::Pending))
        ->not->toThrow(InvalidTransitionException::class);
});

it('does not define an in_review status', function () {
    expect(ItemStatus::tryFrom('in_review'))->toBeNull();
});
