<?php

it('returns ok from the health endpoint', function () {
    $this->getJson('/api/health')
        ->assertOk()
        ->assertJson([
            'status' => 'ok',
            'service' => 'review-queue',
        ]);
});
