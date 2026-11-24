<?php

use App\Models\Item;
use App\Models\Review;
use App\Models\User;

it('includes the latest review note on a queue row', function () {
    $alice = User::factory()->create();
    $bob = User::factory()->create(['name' => 'Bob Smith', 'name_key' => 'bob smith']);
    $item = Item::factory()->create([
        'submitter_id' => $alice->id,
        'title' => 'Commented lab draft',
        'status' => 'needs_work',
    ]);

    Review::query()->create([
        'item_id' => $item->id,
        'reviewer_id' => $bob->id,
        'decision' => 'needs_work',
        'note' => 'Add a materials list.',
    ]);
    Review::query()->create([
        'item_id' => $item->id,
        'reviewer_id' => $bob->id,
        'decision' => 'needs_work',
        'note' => 'Cite the diagram.',
    ]);
    Review::query()->create([
        'item_id' => $item->id,
        'reviewer_id' => $bob->id,
        'decision' => 'approved',
        'note' => null,
    ]);

    $this->getJson('/api/items?q=Commented%20lab%20draft')
        ->assertOk()
        ->assertJsonPath('data.0.latest_comment.note', 'Cite the diagram.')
        ->assertJsonPath('data.0.latest_comment.reviewer_name', 'Bob Smith');
});

it('returns null when nobody left a note', function () {
    $item = Item::factory()->create(['title' => 'Silent row']);

    $this->getJson('/api/items/'.$item->id)
        ->assertOk()
        ->assertJsonPath('data.latest_comment', null);
});
