<?php

namespace App\Services;

use App\Domain\ItemStateMachine;
use App\Domain\ItemTimeline;
use App\Enums\ItemEventKind;
use App\Enums\ItemStatus;
use App\Exceptions\InvalidTransitionException;
use App\Exceptions\NoteRequiredException;
use App\Models\Item;
use App\Models\Review;
use App\Models\User;
use Illuminate\Support\Facades\DB;

final class ReviewService
{
    public function __construct(
        private readonly ItemStateMachine $stateMachine,
    ) {}

    /**
     * Apply one decision to each id. Tx-per-id so #2 can commit while #5 fails.
     *
     * @param  list<int>  $ids
     * @return array{updated: list<int>, failed: list<array{id: int, reason: string}>}
     */
    public function review(
        array $ids,
        string $decision,
        ?string $risk,
        ?string $note,
        string $reviewerName,
    ): array {
        $reviewer = User::query()->firstOrCreate(
            ['name_key' => User::nameKey($reviewerName)],
            ['name' => trim($reviewerName)],
        );

        $items = Item::query()->findMany($ids)->keyBy('id');
        $to = ItemStatus::from($decision);

        if ($to === ItemStatus::NeedsWork && blank($note)) {
            throw new NoteRequiredException;
        }

        $updated = [];
        $failed = [];

        foreach ($ids as $id) {
            $id = (int) $id;

            try {
                $item = $items->get($id);
                if ($item === null) {
                    $failed[] = ['id' => $id, 'reason' => 'not_found'];

                    continue;
                }

                if ((int) $item->submitter_id === (int) $reviewer->id) {
                    $failed[] = ['id' => $id, 'reason' => 'same_person'];

                    continue;
                }

                $from = ItemStatus::from($item->status);
                $this->stateMachine->assertTransition($from, $to);

                DB::transaction(function () use ($item, $reviewer, $to, $risk, $note): void {
                    Review::query()->create([
                        'item_id' => $item->id,
                        'reviewer_id' => $reviewer->id,
                        'decision' => $to->value,
                        'risk' => $risk,
                        'note' => $note,
                    ]);

                    $item->update(['status' => $to->value]);
                    ItemTimeline::record($item->fresh(), $reviewer, ItemEventKind::Reviewed, $to->value, $note);
                });

                $updated[] = $id;
            } catch (InvalidTransitionException) {
                $failed[] = ['id' => $id, 'reason' => 'invalid_transition'];
            }
        }

        return [
            'updated' => $updated,
            'failed' => $failed,
        ];
    }
}
