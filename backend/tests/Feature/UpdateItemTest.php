<?php

use App\Models\Item;
use App\Models\User;

it('updates a needs_work item with PUT and returns it to pending', function () {
    $alice = User::factory()->create(['name' => 'Alice Johnson', 'name_key' => 'alice johnson']);
    $item = Item::factory()->create([
        'submitter_id' => $alice->id,
        'title' => 'Lab worksheet',
        'description' => 'Original copy.',
        'status' => 'needs_work',
    ]);

    $this->putJson("/api/items/{$item->id}", [
        'title' => 'Lab worksheet v2',
        'description' => 'Now with safety warnings.',
        'submitter_name' => 'Alice Johnson',
    ])
        ->assertOk()
        ->assertJsonPath('data.status', 'pending')
        ->assertJsonPath('data.title', 'Lab worksheet v2')
        ->assertJsonPath('data.description', 'Now with safety warnings.');

    expect($item->fresh()->status)->toBe('pending')
        ->and($item->fresh()->title)->toBe('Lab worksheet v2');
});

it('lets the submitter edit a pending item and keeps it pending', function () {
    $alice = User::factory()->create(['name' => 'Alice Johnson', 'name_key' => 'alice johnson']);
    $item = Item::factory()->create(['submitter_id' => $alice->id, 'status' => 'pending', 'title' => 'Keep me']);

    $this->putJson("/api/items/{$item->id}", [
        'title' => 'Changed',
        'description' => 'Still the first draft.',
        'submitter_name' => 'Alice Johnson',
    ])
        ->assertOk()
        ->assertJsonPath('data.status', 'pending')
        ->assertJsonPath('data.title', 'Changed');

    expect($item->fresh()->status)->toBe('pending')
        ->and($item->fresh()->title)->toBe('Changed');
});

it('refuses PUT after the item is approved', function () {
    $alice = User::factory()->create(['name' => 'Alice Johnson', 'name_key' => 'alice johnson']);
    $item = Item::factory()->create(['submitter_id' => $alice->id, 'status' => 'approved', 'title' => 'Keep me']);

    $this->putJson("/api/items/{$item->id}", [
        'title' => 'Changed',
        'description' => 'Too late.',
        'submitter_name' => 'Alice Johnson',
    ])->assertUnprocessable();

    expect($item->fresh()->status)->toBe('approved')
        ->and($item->fresh()->title)->toBe('Keep me');
});

it('refuses PUT from someone who is not the submitter', function () {
    $alice = User::factory()->create(['name' => 'Alice Johnson', 'name_key' => 'alice johnson']);
    $item = Item::factory()->create(['submitter_id' => $alice->id, 'status' => 'needs_work', 'title' => 'Keep me']);

    $this->putJson("/api/items/{$item->id}", [
        'title' => 'Hijacked title',
        'description' => 'Bob should not be able to do this.',
        'submitter_name' => 'Bob Smith',
    ])->assertUnprocessable();

    expect($item->fresh()->title)->toBe('Keep me')
        ->and($item->fresh()->status)->toBe('needs_work');
});
