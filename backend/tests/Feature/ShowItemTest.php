<?php

use App\Models\Item;

it('returns one item by id', function () {
    $item = Item::factory()->create(['title' => 'Open this row']);

    $this->getJson('/api/items/'.$item->id)
        ->assertOk()
        ->assertJsonPath('data.id', $item->id)
        ->assertJsonPath('data.title', 'Open this row')
        ->assertJsonPath('data.submitter.name', $item->submitter->name);
});

it('returns 404 for an unknown item id', function () {
    $this->getJson('/api/items/999999')->assertNotFound();
});
