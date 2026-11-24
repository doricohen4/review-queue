<?php

namespace Database\Factories;

use App\Models\Item;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Item>
 */
class ItemFactory extends Factory
{
    public function definition(): array
    {
        return [
            'title' => fake()->sentence(4),
            'description' => fake()->paragraph(),
            'submitter_id' => User::factory(),
            'status' => 'pending',
            'risk' => 'low',
            'risk_score' => 8,
            'flags' => [],
            'confidence' => 'high',
            'suggested_decision' => 'approve',
        ];
    }
}
