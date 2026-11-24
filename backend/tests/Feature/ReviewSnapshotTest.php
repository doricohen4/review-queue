<?php

use App\Models\Item;
use App\Models\Review;
use App\Models\User;

it('freezes copy on the history row so a later edit does not rewrite it', function () {
    $alice = User::factory()->create(['name' => 'Alice Johnson', 'name_key' => 'alice johnson']);
    $item = Item::factory()->create([
        'submitter_id' => $alice->id,
        'status' => 'pending',
        'title' => 'Login quiz',
        'description' => 'Share the classroom password with students.',
        'risk' => 'high',
        'risk_score' => 60,
        'flags' => [
            ['key' => 'keyword:password', 'weight' => 40, 'reason' => 'password token'],
        ],
        'confidence' => 'high',
        'suggested_decision' => 'reject',
    ]);

    $this->postJson('/api/items/review', [
        'ids' => [$item->id],
        'decision' => 'needs_work',
        'note' => 'Please remove the password.',
        'reviewer_name' => 'Bob Smith',
    ])->assertOk();

    $this->postJson("/api/items/{$item->id}/resubmit", [
        'title' => 'Login quiz v2',
        'description' => 'Warm-up questions for the login lesson.',
        'submitter_name' => 'Alice Johnson',
    ])->assertOk();

    $this->getJson("/api/items/{$item->id}/audit")
        ->assertOk()
        ->assertJsonPath('data.0.kind', 'reviewed')
        ->assertJsonPath('data.0.decision', 'needs_work')
        ->assertJsonPath('data.0.snapshot.title', 'Login quiz')
        ->assertJsonPath('data.0.snapshot.description', 'Share the classroom password with students.')
        ->assertJsonPath('data.0.snapshot.risk_score', 60)
        ->assertJsonPath('data.0.snapshot.suggested_decision', 'reject')
        ->assertJsonPath('data.0.snapshot.flags.0.key', 'keyword:password');

    expect(Review::query()->where('item_id', $item->id)->value('note'))->toBe('Please remove the password.');
    expect(Schema::hasColumn('reviews', 'snapshot_title'))->toBeFalse();
});
