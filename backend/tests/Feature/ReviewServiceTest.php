<?php

use App\Domain\ItemStateMachine;
use App\Exceptions\NoteRequiredException;
use App\Models\Item;
use App\Models\Review;
use App\Models\User;
use App\Services\ReviewService;

function reviewAsService(): ReviewService
{
    return new ReviewService(new ItemStateMachine);
}

function pendingItemFor(User $submitter, array $overrides = []): Item
{
    return Item::factory()->create([
        'submitter_id' => $submitter->id,
        'status' => 'pending',
        ...$overrides,
    ]);
}

it('approves a pending item and writes a review row', function () {
    $alice = User::factory()->create();
    $item = pendingItemFor($alice);

    $result = reviewAsService()->review([$item->id], 'approved', 'low', 'Looks good', 'Bob Smith');

    expect($result['updated'])->toBe([$item->id])
        ->and($result['failed'])->toBe([])
        ->and($item->fresh()->status)->toBe('approved');

    $row = Review::query()->where('item_id', $item->id)->first();
    expect($row)->not->toBeNull()
        ->and($row->decision)->toBe('approved')
        ->and($row->risk)->toBe('low')
        ->and($row->note)->toBe('Looks good');
});

it('rejects a pending item', function () {
    $alice = User::factory()->create();
    $item = pendingItemFor($alice);

    $result = reviewAsService()->review([$item->id], 'rejected', null, null, 'Bob Smith');

    expect($result['updated'])->toBe([$item->id])
        ->and($item->fresh()->status)->toBe('rejected');
});

it('refuses needs_work when the note is missing', function () {
    $alice = User::factory()->create();
    $item = pendingItemFor($alice);

    expect(fn () => reviewAsService()->review([$item->id], 'needs_work', null, null, 'Bob Smith'))
        ->toThrow(NoteRequiredException::class);

    expect($item->fresh()->status)->toBe('pending');
});

it('sends a pending item to needs_work', function () {
    $alice = User::factory()->create();
    $item = pendingItemFor($alice);

    $result = reviewAsService()->review([$item->id], 'needs_work', null, 'Please clarify the lab steps.', 'Bob Smith');

    expect($result['updated'])->toBe([$item->id])
        ->and($item->fresh()->status)->toBe('needs_work');
});

it('records not_found without writing', function () {
    $result = reviewAsService()->review([99999], 'approved', null, null, 'Bob Smith');

    expect($result['updated'])->toBe([])
        ->and($result['failed'])->toBe([['id' => 99999, 'reason' => 'not_found']])
        ->and(Review::query()->count())->toBe(0);
});

it('records same_person when the submitter is the reviewer', function () {
    $alice = User::factory()->create(['name' => 'Alice Johnson', 'name_key' => 'alice johnson']);
    $item = pendingItemFor($alice);

    $result = reviewAsService()->review([$item->id], 'approved', null, null, 'Alice Johnson');

    expect($result['failed'][0]['reason'])->toBe('same_person')
        ->and($item->fresh()->status)->toBe('pending')
        ->and(Review::query()->count())->toBe(0);
});

it('records invalid_transition on a terminal item', function () {
    $alice = User::factory()->create();
    $item = pendingItemFor($alice, ['status' => 'approved']);

    $result = reviewAsService()->review([$item->id], 'rejected', null, null, 'Bob Smith');

    expect($result['failed'][0]['reason'])->toBe('invalid_transition')
        ->and($item->fresh()->status)->toBe('approved')
        ->and(Review::query()->count())->toBe(0);
});

it('does not reopen needs_work with approve', function () {
    $alice = User::factory()->create();
    $item = pendingItemFor($alice, ['status' => 'needs_work']);

    $result = reviewAsService()->review([$item->id], 'approved', null, null, 'Bob Smith');

    expect($result['failed'][0]['reason'])->toBe('invalid_transition')
        ->and($item->fresh()->status)->toBe('needs_work');
});

it('keeps an earlier success when a later id fails', function () {
    $alice = User::factory()->create();
    $ok = pendingItemFor($alice);
    $terminal = pendingItemFor($alice, ['status' => 'rejected']);

    $result = reviewAsService()->review([$ok->id, $terminal->id], 'approved', null, null, 'Bob Smith');

    expect($result['updated'])->toBe([$ok->id])
        ->and($result['failed'][0])->toBe(['id' => $terminal->id, 'reason' => 'invalid_transition'])
        ->and($ok->fresh()->status)->toBe('approved')
        ->and($terminal->fresh()->status)->toBe('rejected');
});

it('still reviews a later id after an earlier failure', function () {
    $alice = User::factory()->create();
    $terminal = pendingItemFor($alice, ['status' => 'cancelled']);
    $ok = pendingItemFor($alice);

    $result = reviewAsService()->review([$terminal->id, $ok->id], 'approved', null, null, 'Bob Smith');

    expect($result['failed'][0]['reason'])->toBe('invalid_transition')
        ->and($result['updated'])->toBe([$ok->id])
        ->and($ok->fresh()->status)->toBe('approved');
});
