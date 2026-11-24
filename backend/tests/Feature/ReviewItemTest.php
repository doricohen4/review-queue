<?php

use App\Models\Item;
use App\Models\Review;
use App\Models\User;

it('approves one item with 200 and empty failed', function () {
    $alice = User::factory()->create(['name' => 'Alice Johnson', 'name_key' => 'alice johnson']);
    $item = Item::factory()->create(['submitter_id' => $alice->id, 'status' => 'pending']);

    $this->postJson('/api/items/review', [
        'ids' => [$item->id],
        'decision' => 'approved',
        'reviewer_name' => 'Bob Smith',
    ])
        ->assertOk()
        ->assertJsonPath('data.failed', [])
        ->assertJsonPath('data.updated.0', $item->id)
        ->assertJsonPath('meta.updated_count', 1)
        ->assertJsonPath('meta.failed_count', 0);

    expect($item->fresh()->status)->toBe('approved');
    expect(Review::query()->where('item_id', $item->id)->count())->toBe(1);
});

it('returns 207 when some ids fail', function () {
    $alice = User::factory()->create();
    $ok = Item::factory()->create(['submitter_id' => $alice->id, 'status' => 'pending']);

    $this->postJson('/api/items/review', [
        'ids' => [$ok->id, 99999],
        'decision' => 'rejected',
        'reviewer_name' => 'Bob Smith',
    ])
        ->assertStatus(207)
        ->assertJsonPath('meta.updated_count', 1)
        ->assertJsonPath('meta.failed_count', 1)
        ->assertJsonPath('data.failed.0.id', 99999)
        ->assertJsonPath('data.failed.0.reason', 'not_found');

    expect($ok->fresh()->status)->toBe('rejected');
});

it('rejects same person reviewing their own item', function () {
    $alice = User::factory()->create(['name' => 'Alice Johnson', 'name_key' => 'alice johnson']);
    $item = Item::factory()->create(['submitter_id' => $alice->id, 'status' => 'pending']);

    $this->postJson('/api/items/review', [
        'ids' => [$item->id],
        'decision' => 'approved',
        'reviewer_name' => 'Alice Johnson',
    ])
        ->assertStatus(207)
        ->assertJsonPath('data.failed.0.reason', 'same_person')
        ->assertJsonPath('meta.updated_count', 0);

    expect($item->fresh()->status)->toBe('pending');
    expect(Review::query()->count())->toBe(0);
});

it('rejects a body that never reaches the loop', function () {
    $this->postJson('/api/items/review', [
        'decision' => 'approved',
        'reviewer_name' => 'Bob Smith',
    ])->assertUnprocessable();
});

it('rejects an empty ids list with 422', function () {
    $this->postJson('/api/items/review', [
        'ids' => [],
        'decision' => 'approved',
        'reviewer_name' => 'Bob Smith',
    ])->assertUnprocessable();
});

it('rejects an unknown decision with 422', function () {
    $this->postJson('/api/items/review', [
        'ids' => [1],
        'decision' => 'pending',
        'reviewer_name' => 'Bob Smith',
    ])->assertUnprocessable();
});

it('maps invalid_transition through the HTTP envelope as 207', function () {
    $alice = User::factory()->create();
    $item = Item::factory()->create(['submitter_id' => $alice->id, 'status' => 'approved']);

    $this->postJson('/api/items/review', [
        'ids' => [$item->id],
        'decision' => 'rejected',
        'reviewer_name' => 'Bob Smith',
    ])
        ->assertStatus(207)
        ->assertJsonPath('data.failed.0.reason', 'invalid_transition');
});
