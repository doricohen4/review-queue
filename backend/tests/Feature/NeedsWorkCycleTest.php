<?php

use App\Models\Item;
use App\Models\User;

it('rejects needs_work without a note', function () {
    $alice = User::factory()->create();
    $item = Item::factory()->create(['submitter_id' => $alice->id, 'status' => 'pending']);

    $this->postJson('/api/items/review', [
        'ids' => [$item->id],
        'decision' => 'needs_work',
        'reviewer_name' => 'Bob Smith',
    ])->assertUnprocessable();

    expect($item->fresh()->status)->toBe('pending');
});

it('rejects a whitespace-only needs_work note', function () {
    $alice = User::factory()->create();
    $item = Item::factory()->create(['submitter_id' => $alice->id, 'status' => 'pending']);

    $this->postJson('/api/items/review', [
        'ids' => [$item->id],
        'decision' => 'needs_work',
        'note' => '   ',
        'reviewer_name' => 'Bob Smith',
    ])->assertUnprocessable();

    expect($item->fresh()->status)->toBe('pending');
});

it('keeps a note per cycle after needs_work, resubmit, and a second send-back', function () {
    $alice = User::factory()->create(['name' => 'Alice Johnson', 'name_key' => 'alice johnson']);
    $item = Item::factory()->create([
        'submitter_id' => $alice->id,
        'title' => 'Lab worksheet',
        'description' => 'Original copy.',
        'status' => 'pending',
    ]);

    $this->postJson('/api/items/review', [
        'ids' => [$item->id],
        'decision' => 'needs_work',
        'note' => 'Add safety warnings.',
        'reviewer_name' => 'Bob Smith',
    ])->assertOk();

    $this->postJson("/api/items/{$item->id}/resubmit", [
        'title' => 'Lab worksheet v2',
        'description' => 'Now with safety warnings.',
        'submitter_name' => 'Alice Johnson',
    ])
        ->assertOk()
        ->assertJsonPath('data.status', 'pending')
        ->assertJsonPath('data.title', 'Lab worksheet v2');

    $this->postJson('/api/items/review', [
        'ids' => [$item->id],
        'decision' => 'needs_work',
        'note' => 'Cite the source for the diagram.',
        'reviewer_name' => 'Bob Smith',
    ])->assertOk();

    $this->getJson("/api/items/{$item->id}/audit")
        ->assertOk()
        ->assertJsonPath('meta.total', 2)
        ->assertJsonPath('data.0.note', 'Add safety warnings.')
        ->assertJsonPath('data.0.decision', 'needs_work')
        ->assertJsonPath('data.1.note', 'Cite the source for the diagram.');
});

it('approves after needs_work and resubmit', function () {
    $alice = User::factory()->create(['name' => 'Alice Johnson', 'name_key' => 'alice johnson']);
    $item = Item::factory()->create(['submitter_id' => $alice->id, 'status' => 'pending']);

    $this->postJson('/api/items/review', [
        'ids' => [$item->id],
        'decision' => 'needs_work',
        'note' => 'Fix the title.',
        'reviewer_name' => 'Bob Smith',
    ])->assertOk();

    $this->postJson("/api/items/{$item->id}/resubmit", [
        'title' => 'Fixed lab worksheet',
        'description' => 'Safety warnings included.',
        'submitter_name' => 'Alice Johnson',
    ])
        ->assertOk()
        ->assertJsonPath('data.status', 'pending');

    $this->postJson('/api/items/review', [
        'ids' => [$item->id],
        'decision' => 'approved',
        'reviewer_name' => 'Bob Smith',
    ])->assertOk();

    expect($item->fresh()->status)->toBe('approved');

    $this->getJson("/api/items/{$item->id}/audit")
        ->assertOk()
        ->assertJsonPath('meta.total', 2)
        ->assertJsonPath('data.0.decision', 'needs_work')
        ->assertJsonPath('data.1.decision', 'approved');
});

it('rejects after needs_work and resubmit', function () {
    $alice = User::factory()->create(['name' => 'Alice Johnson', 'name_key' => 'alice johnson']);
    $item = Item::factory()->create(['submitter_id' => $alice->id, 'status' => 'pending']);

    $this->postJson('/api/items/review', [
        'ids' => [$item->id],
        'decision' => 'needs_work',
        'note' => 'This still looks unsafe.',
        'reviewer_name' => 'Bob Smith',
    ])->assertOk();

    $this->postJson("/api/items/{$item->id}/resubmit", [
        'title' => 'Lab worksheet v2',
        'description' => 'Unchanged experiment.',
        'submitter_name' => 'Alice Johnson',
    ])->assertOk();

    $this->postJson('/api/items/review', [
        'ids' => [$item->id],
        'decision' => 'rejected',
        'reviewer_name' => 'Bob Smith',
    ])->assertOk();

    expect($item->fresh()->status)->toBe('rejected');
});

it('does not resubmit until the item is in needs_work', function () {
    $alice = User::factory()->create(['name' => 'Alice Johnson', 'name_key' => 'alice johnson']);
    $item = Item::factory()->create(['submitter_id' => $alice->id, 'status' => 'pending']);

    $this->postJson("/api/items/{$item->id}/resubmit", [
        'title' => 'Lab worksheet',
        'description' => 'Still the first draft.',
        'submitter_name' => 'Alice Johnson',
    ])->assertUnprocessable();

    expect($item->fresh()->status)->toBe('pending');
});

it('does not let a reviewer resubmit the submitter item', function () {
    $alice = User::factory()->create(['name' => 'Alice Johnson', 'name_key' => 'alice johnson']);
    $item = Item::factory()->create(['submitter_id' => $alice->id, 'status' => 'needs_work']);

    $this->postJson("/api/items/{$item->id}/resubmit", [
        'title' => 'Hijacked title',
        'description' => 'Bob should not be able to do this.',
        'submitter_name' => 'Bob Smith',
    ])->assertUnprocessable();

    expect($item->fresh()->title)->toBe($item->title)
        ->and($item->fresh()->status)->toBe('needs_work');
});
