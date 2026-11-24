<?php

use App\Enums\ItemEventKind;
use App\Models\Item;
use App\Models\ItemEvent;
use App\Models\Review;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /** Copy existing reviews (and a first submit) onto the new timeline. */
    public function up(): void
    {
        Item::query()->with(['submitter', 'reviews'])->orderBy('id')->each(function (Item $item): void {
            if ($item->events()->exists()) {
                return;
            }

            if ($item->submitter !== null) {
                ItemEvent::query()->create([
                    'item_id' => $item->id,
                    'actor_id' => $item->submitter_id,
                    'kind' => ItemEventKind::Submitted->value,
                    'snapshot_title' => $item->title,
                    'snapshot_description' => $item->description,
                    'snapshot_risk' => $item->risk,
                    'snapshot_risk_score' => $item->risk_score,
                    'snapshot_flags' => $item->flags,
                    'snapshot_confidence' => $item->confidence,
                    'snapshot_suggested_decision' => $item->suggested_decision,
                    'created_at' => $item->created_at,
                ]);
            }

            foreach ($item->reviews as $review) {
                /** @var Review $review */
                ItemEvent::query()->create([
                    'item_id' => $item->id,
                    'actor_id' => $review->reviewer_id,
                    'kind' => ItemEventKind::Reviewed->value,
                    'decision' => $review->decision,
                    'note' => $review->note,
                    'snapshot_title' => $item->title,
                    'snapshot_description' => $item->description,
                    'snapshot_risk' => $item->risk,
                    'snapshot_risk_score' => $item->risk_score,
                    'snapshot_flags' => $item->flags,
                    'snapshot_confidence' => $item->confidence,
                    'snapshot_suggested_decision' => $item->suggested_decision,
                    'created_at' => $review->created_at,
                ]);
            }
        });
    }

    public function down(): void
    {
        ItemEvent::query()->delete();
    }
};
