<?php

namespace App\Services;

use App\Domain\ItemStateMachine;
use App\Domain\ItemTimeline;
use App\Domain\Moderation\HeuristicFlag;
use App\Domain\Moderation\ModerationPipeline;
use App\Enums\ItemEventKind;
use App\Enums\ItemStatus;
use App\Exceptions\CannotResubmitException;
use App\Exceptions\CannotReviseException;
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

            $item = Item::query()->create([
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

            ItemTimeline::record($item, $user, ItemEventKind::Submitted);

            return $item;
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

        return $this->storeRevision($item, $title, $description, ItemEventKind::Resubmitted);
    }

    /**
     * Author edits pending copy in place and re-runs the heuristic. Status stays pending.
     *
     * @throws CannotResubmitException
     * @throws CannotReviseException
     * @throws InvalidTransitionException
     */
    public function revise(Item $item, string $title, string $description, string $submitterName): Item
    {
        $this->assertAuthor($item, $submitterName);

        $from = ItemStatus::from($item->status);
        if ($from === ItemStatus::NeedsWork) {
            throw new CannotReviseException;
        }
        if ($from !== ItemStatus::Pending) {
            $this->stateMachine->assertTransition($from, ItemStatus::Pending);
        }

        return $this->storeRevision($item, $title, $description, ItemEventKind::Revised);
    }

    /** @throws CannotResubmitException */
    private function assertAuthor(Item $item, string $submitterName): void
    {
        $submitter = User::query()->where('name_key', User::nameKey($submitterName))->first();
        if ($submitter === null || (int) $submitter->id !== (int) $item->submitter_id) {
            throw new CannotResubmitException;
        }
    }

    private function storeRevision(Item $item, string $title, string $description, ItemEventKind $kind): Item
    {
        $result = $this->pipeline->evaluate($title, $description);

        return DB::transaction(function () use ($item, $title, $description, $result, $kind): Item {
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

            $item = $item->refresh()->load(['submitter', 'latestComment.actor']);
            $actor = $item->submitter;
            if ($actor === null) {
                throw new CannotResubmitException;
            }
            ItemTimeline::record($item, $actor, $kind);

            return $item;
        });
    }
}
