<?php

namespace App\Services;

use App\Domain\ItemStateMachine;
use App\Domain\Moderation\HeuristicFlag;
use App\Domain\Moderation\ModerationPipeline;
use App\Enums\ItemStatus;
use App\Exceptions\CannotResubmitException;
use App\Exceptions\InvalidTransitionException;
use App\Models\Item;
use App\Models\User;
use Illuminate\Support\Facades\DB;

final class ItemService
{
    /** Pipeline scores copy; state machine gates resubmit. */
    public function __construct(
        private readonly ModerationPipeline $pipeline,
        private readonly ItemStateMachine $stateMachine,
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

    /**
     * Submitter sends needs_work copy back to pending and stores a new heuristic snapshot.
     *
     * @throws CannotResubmitException
     * @throws InvalidTransitionException
     */
    public function resubmit(Item $item, string $title, string $description, string $submitterName): Item
    {
        $this->assertAuthor($item, $submitterName);
        $this->stateMachine->assertTransition(
            ItemStatus::from($item->status),
            ItemStatus::Pending,
        );

        return $this->storeRevision($item, $title, $description);
    }

    /**
     * Author edits pending copy in place, or sends needs_work copy back to pending.
     *
     * @throws CannotResubmitException
     * @throws InvalidTransitionException
     */
    public function revise(Item $item, string $title, string $description, string $submitterName): Item
    {
        $this->assertAuthor($item, $submitterName);

        $from = ItemStatus::from($item->status);
        if ($from === ItemStatus::NeedsWork) {
            $this->stateMachine->assertTransition($from, ItemStatus::Pending);
        } elseif ($from !== ItemStatus::Pending) {
            $this->stateMachine->assertTransition($from, ItemStatus::Pending);
        }

        return $this->storeRevision($item, $title, $description);
    }

    /** @throws CannotResubmitException */
    private function assertAuthor(Item $item, string $submitterName): void
    {
        $submitter = User::query()->where('name_key', User::nameKey($submitterName))->first();
        if ($submitter === null || (int) $submitter->id !== (int) $item->submitter_id) {
            throw new CannotResubmitException;
        }
    }

    private function storeRevision(Item $item, string $title, string $description): Item
    {
        $result = $this->pipeline->evaluate($title, $description);

        return DB::transaction(function () use ($item, $title, $description, $result): Item {
            $item->update([
                'title' => $title,
                'description' => $description,
                'status' => ItemStatus::Pending->value,
                'risk' => $result->risk->value,
                'risk_score' => $result->riskScore,
                'flags' => array_map(fn (HeuristicFlag $flag) => $flag->toArray(), $result->flags),
                'confidence' => $result->confidence,
                'suggested_decision' => $result->suggestedDecision,
            ]);

            return $item->refresh()->load(['submitter', 'latestComment.reviewer']);
        });
    }
}
