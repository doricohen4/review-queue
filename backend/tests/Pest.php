<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');

/** Shared ItemResource example — same file the frontend parseItem tests import. */
function itemResourceContract(): array
{
    return json_decode(
        file_get_contents(dirname(base_path()).'/contracts/item-resource.json'),
        true,
        512,
        JSON_THROW_ON_ERROR,
    );
}
