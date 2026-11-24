<?php

namespace App\Services;

use App\Domain\Moderation\HeuristicFlag;
use App\Domain\Moderation\ModerationPipeline;
use App\Enums\ItemStatus;
use App\Models\Item;
use App\Models\User;
use Illuminate\Support\Facades\DB;

final class ItemService
{
    /** Pipeline is injected so submit() does not new up rules itself. */
    public function __construct(
        private readonly ModerationPipeline $pipeline,
    ) {}

    /** Create a pending item: resolve submitter, score text, persist the snapshot. */
    public function submit(string $title, string $description, string $submitterName): Item
    {
        $result = $this->pipeline->evaluate($title, $description);

        return DB::transaction(function () use ($title, $description, $submitterName, $result): Item {
            $user = User::query()->firstOrCreate(
                ['name_key' => User::nameKey($submitterName)],
                ['name' => trim($submitterName)],
            );

            return Item::query()->create([
                'title' => $title,
                'description' => $description,
                'submitter_id' => $user->id,
                'status' => ItemStatus::Pending->value,
                'risk' => $result->risk->value,
                'risk_score' => $result->riskScore,
                'flags' => array_map(fn (HeuristicFlag $flag) => $flag->toArray(), $result->flags),
                'confidence' => $result->confidence,
                'suggested_decision' => $result->suggestedDecision,
            ]);
        });
    }
}
