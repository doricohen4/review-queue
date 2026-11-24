<?php

use App\Domain\ItemTimeline;
use App\Enums\ItemEventKind;
use App\Models\Item;
use App\Models\User;

it('includes the latest review note on a queue row', function () {
    $alice = User::factory()->create();
    $bob = User::factory()->create(['name' => 'Bob Smith', 'name_key' => 'bob smith']);
    $item = Item::factory()->create([
        'submitter_id' => $alice->id,
        'title' => 'Commented lab draft',
        'status' => 'needs_work',
    ]);

    ItemTimeline::record($item, $bob, ItemEventKind::Reviewed, 'needs_work', 'Add a materials list.');
    ItemTimeline::record($item, $bob, ItemEventKind::Reviewed, 'needs_work', 'Cite the diagram.');
    ItemTimeline::record($item, $bob, ItemEventKind::Reviewed, 'approved');

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

it('drops latest_comment after the author addresses the send-back', function () {
    $alice = User::factory()->create(['name' => 'Alice Johnson', 'name_key' => 'alice johnson']);
    $item = Item::factory()->create([
        'submitter_id' => $alice->id,
        'status' => 'pending',
        'title' => 'Lab worksheet',
        'description' => 'Original classroom copy.',
    ]);

    $this->postJson('/api/items/review', [
        'ids' => [$item->id],
        'decision' => 'needs_work',
        'note' => 'Add safety warnings.',
        'reviewer_name' => 'Bob Smith',
    ])->assertOk();

    $this->getJson('/api/items/'.$item->id)
        ->assertOk()
        ->assertJsonPath('data.latest_comment.note', 'Add safety warnings.')
        ->assertJsonPath('data.latest_comment.reviewer_name', 'Bob Smith');

    $this->postJson("/api/items/{$item->id}/resubmit", [
        'title' => 'Lab worksheet v2',
        'description' => 'Safety warnings included.',
        'submitter_name' => 'Alice Johnson',
    ])->assertOk();

    $this->getJson('/api/items/'.$item->id)
        ->assertOk()
        ->assertJsonPath('data.latest_comment', null);

    $this->getJson('/api/items?q=Lab%20worksheet%20v2')
        ->assertOk()
        ->assertJsonPath('data.0.latest_comment', null);
});
