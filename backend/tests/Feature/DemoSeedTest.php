<?php

use App\Models\Item;
use App\Models\User;

it('seeds demo personas and a filled mock queue', function () {
    $this->seed();

    expect(User::query()->where('name_key', 'alice johnson')->exists())->toBeTrue();
    expect(User::query()->where('name_key', 'bob smith')->exists())->toBeTrue();
    expect(User::query()->where('name_key', 'dana cole')->exists())->toBeTrue();
    expect(Item::query()->count())->toBeGreaterThan(8);
    expect(Item::query()->where('title', 'Admin password reset workflow')->value('risk_score'))->toBe(100);
});
