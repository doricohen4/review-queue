<?php

use App\Enums\ItemStatus;
use App\Enums\RiskLevel;
use App\Models\Item;

function resourceKeys(array $payload): array
{
    $keys = array_keys($payload);
    sort($keys);

    return $keys;
}

it('GET /api/items/{id} matches the shared ItemResource contract', function () {
    $item = Item::factory()->create([
        'flags' => [
            ['key' => 'keyword:password', 'weight' => 40, 'reason' => 'password token'],
        ],
    ]);

    $data = $this->getJson('/api/items/'.$item->id)
        ->assertOk()
        ->assertJsonStructure([
            'data' => [
                'id',
                'title',
                'description',
                'status',
                'risk',
                'risk_score',
                'flags' => [
                    '*' => ['key', 'weight', 'reason'],
                ],
                'confidence',
                'suggested_decision',
                'submitter' => ['id', 'name'],
                'latest_comment',
                'created_at',
                'updated_at',
            ],
        ])
        ->json('data');

    expect(resourceKeys($data))->toBe(resourceKeys(itemResourceContract()));

    $statuses = array_column(ItemStatus::cases(), 'value');
    $risks = array_column(RiskLevel::cases(), 'value');

    expect($data['status'])->toBeIn($statuses)
        ->and($data['risk'])->toBeIn([...$risks, null])
        ->and($risks)->not->toContain('none')
        ->and($statuses)->not->toContain('in_review')
        ->and($statuses)->not->toContain('cancelled');
});

it('GET /api/items list envelope has data plus the meta the SPA reads', function () {
    Item::factory()->create();

    $this->getJson('/api/items')
        ->assertOk()
        ->assertJsonStructure([
            'data' => [
                '*' => [
                    'id',
                    'title',
                    'status',
                    'risk',
                    'risk_score',
                    'flags',
                    'submitter' => ['id', 'name'],
                ],
            ],
            'meta' => [
                'total',
                'current_page',
                'last_page',
                'per_page',
            ],
        ]);
});

it('GET /api/items/filters catalog uses the same enums as ItemResource', function () {
    $catalog = $this->getJson('/api/items/filters')
        ->assertOk()
        ->assertJsonStructure([
            'data' => [
                'status' => ['*' => ['value', 'label']],
                'risk' => ['*' => ['value', 'label']],
                'sort' => ['*' => ['value', 'label']],
                'submitter' => ['*' => ['value', 'label']],
            ],
        ])
        ->json('data');

    expect(collect($catalog['status'])->pluck('value')->all())
        ->toBe(array_column(ItemStatus::cases(), 'value'))
        ->and(collect($catalog['risk'])->pluck('value')->all())
        ->toBe(array_column(RiskLevel::cases(), 'value'))
        ->and(collect($catalog['risk'])->pluck('value'))->not->toContain('none');
});
