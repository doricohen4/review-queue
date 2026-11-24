<?php

use App\Models\Item;
use App\Models\User;

it('returns pending items when filter[status]=pending', function () {
    Item::factory()->create(['status' => 'pending', 'title' => 'Waiting on review']);
    Item::factory()->create(['status' => 'approved', 'title' => 'Already shipped']);

    $this->getJson('/api/items?filter[status]=pending')
        ->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.status', 'pending')
        ->assertJsonPath('data.0.title', 'Waiting on review');
});

it('ORs comma-separated status and risk filters', function () {
    Item::factory()->create(['status' => 'pending', 'risk' => 'low', 'title' => 'Open low']);
    Item::factory()->create(['status' => 'needs_work', 'risk' => 'critical', 'title' => 'Send back']);
    Item::factory()->create(['status' => 'approved', 'risk' => 'low', 'title' => 'Done']);

    $this->getJson('/api/items?filter[status]=pending,needs_work')
        ->assertOk()
        ->assertJsonPath('meta.total', 2);

    $this->getJson('/api/items?filter[risk]=low,medium')
        ->assertOk()
        ->assertJsonPath('meta.total', 2);
});

it('rejects unknown filter keys with 422', function () {
    $this->getJson('/api/items?filter[foo]=bar')
        ->assertUnprocessable();
});

it('ignores the item query param on the list URL', function () {
    Item::factory()->create(['title' => 'Open in the side panel']);

    $this->getJson('/api/items?item=12')
        ->assertOk()
        ->assertJsonPath('meta.total', 1);
});

it('searches title and description with q', function () {
    Item::factory()->create(['title' => 'Grade 5 math quiz', 'description' => 'Fractions']);
    Item::factory()->create(['title' => 'Science lab', 'description' => 'Volcano experiment']);

    $this->getJson('/api/items?q=math')
        ->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.title', 'Grade 5 math quiz');
});

it('lets the client pick page size within a cap', function () {
    Item::factory()->count(3)->create();

    $this->getJson('/api/items?per_page=2')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('meta.per_page', 2)
        ->assertJsonPath('meta.total', 3)
        ->assertJsonPath('meta.last_page', 2);
});

it('rejects per_page outside 1–50 with 422', function () {
    $this->getJson('/api/items?per_page=99')
        ->assertUnprocessable();
});

it('accepts updated_at sort keys from the table headers', function () {
    $this->getJson('/api/items?sort=-updated_at')->assertOk();
    $this->getJson('/api/items?sort=updated_at')->assertOk();
});

it('rejects unknown sort keys with 422', function () {
    $this->getJson('/api/items?sort=not_a_column')
        ->assertUnprocessable();
});

it('keeps a stable order when timestamps match', function () {
    $at = now();
    $first = Item::factory()->create(['title' => 'Same time A', 'created_at' => $at]);
    $second = Item::factory()->create(['title' => 'Same time B', 'created_at' => $at]);

    $this->getJson('/api/items?sort=created_at')
        ->assertOk()
        ->assertJsonPath('data.0.id', $first->id)
        ->assertJsonPath('data.1.id', $second->id);
});

it('exposes toolbar options from the same registry', function () {
    $alice = User::factory()->create(['name' => 'Alice Johnson', 'name_key' => 'alice johnson']);

    $this->getJson('/api/items/filters')
        ->assertOk()
        ->assertJsonPath('data.status.0.value', 'pending')
        ->assertJsonStructure([
            'data' => [
                'status' => [['value', 'label']],
                'risk' => [['value', 'label']],
                'sort' => [['value', 'label']],
                'submitter' => [['value', 'label']],
            ],
        ])
        ->assertJsonFragment(['value' => (string) $alice->id, 'label' => 'Alice Johnson']);

    foreach ($this->getJson('/api/items/filters')->json('data.sort') as $option) {
        $this->getJson('/api/items?sort='.$option['value'])->assertOk();
    }
});
