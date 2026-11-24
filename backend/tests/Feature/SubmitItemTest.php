<?php

use App\Domain\ContentLimits;
use App\Models\Item;
use App\Models\User;

it('stores a submitted item with a heuristic snapshot', function () {
    $response = $this->postJson('/api/items', [
        'title' => 'Admin password reset',
        'description' => 'Share credentials with the class.',
        'submitter_name' => 'Alice Johnson',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.status', 'pending')
        ->assertJsonPath('data.title', 'Admin password reset')
        ->assertJsonPath('data.submitter.name', 'Alice Johnson');

    expect($response->json('data.risk_score'))->toBeGreaterThanOrEqual(60);
    expect(collect($response->json('data.flags'))->pluck('key'))
        ->toContain('keyword:password');

    expect(Item::query()->count())->toBe(1);
    expect(User::query()->where('name_key', 'alice johnson')->exists())->toBeTrue();
});

it('rejects submit without a title', function () {
    $this->postJson('/api/items', [
        'description' => 'Body copy for the classroom.',
        'submitter_name' => 'Alice Johnson',
    ])->assertUnprocessable();
});

it('rejects submit without a description', function () {
    $this->postJson('/api/items', [
        'title' => 'Math quiz template',
        'submitter_name' => 'Alice Johnson',
    ])->assertUnprocessable();
});

it('rejects a title longer than ContentLimits', function () {
    $this->postJson('/api/items', [
        'title' => str_repeat('A', ContentLimits::TITLE_MAX + 1),
        'description' => 'Body copy for the classroom.',
        'submitter_name' => 'Alice Johnson',
    ])->assertUnprocessable();
});

it('rejects a submitter name longer than ContentLimits', function () {
    $this->postJson('/api/items', [
        'title' => 'Math quiz template',
        'description' => 'Body copy for the classroom.',
        'submitter_name' => str_repeat('A', ContentLimits::NAME_MAX + 1),
    ])->assertUnprocessable();
});
