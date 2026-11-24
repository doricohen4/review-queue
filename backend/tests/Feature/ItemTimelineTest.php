<?php

use App\Domain\ItemTimeline;
use App\Enums\ItemEventKind;
use App\Models\Item;
use App\Models\User;

it('records submit and a later author update on the audit timeline', function () {
    $this->postJson('/api/items', [
        'title' => 'Login quiz draft',
        'description' => 'Warm-up for the login lesson.',
        'submitter_name' => 'Alice Johnson',
    ])->assertCreated();

    $item = Item::query()->firstOrFail();

    $this->putJson("/api/items/{$item->id}", [
        'title' => 'Login quiz updated',
        'description' => 'Warm-up plus a worked example.',
        'submitter_name' => 'Alice Johnson',
    ])->assertOk();

    $this->getJson("/api/items/{$item->id}/audit")
        ->assertOk()
        ->assertJsonPath('data.0.kind', 'submitted')
        ->assertJsonPath('data.0.snapshot.title', 'Login quiz draft')
        ->assertJsonPath('data.1.kind', 'revised')
        ->assertJsonPath('data.1.snapshot.title', 'Login quiz updated')
        ->assertJsonPath('data.1.actor.name', 'Alice Johnson');
});

it('keeps reviewer comments on the timeline after a send-back', function () {
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

    $this->getJson("/api/items/{$item->id}/audit")
        ->assertOk()
        ->assertJsonPath('data.0.kind', 'reviewed')
        ->assertJsonPath('data.0.decision', 'needs_work')
        ->assertJsonPath('data.0.note', 'Add safety warnings.');
});

it('stamps submitted history with the item created_at, not the moment we record the row', function () {
    $when = now()->subMinutes(51);
    $alice = User::factory()->create();
    $item = Item::factory()->create([
        'submitter_id' => $alice->id,
        'created_at' => $when,
        'updated_at' => $when,
    ]);

    $event = ItemTimeline::record($item, $alice, ItemEventKind::Submitted);

    expect($event->created_at?->equalTo($item->fresh()->created_at))->toBeTrue();
});
