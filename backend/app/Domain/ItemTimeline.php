<?php

namespace App\Domain;

use App\Enums\ItemEventKind;
use App\Models\Item;
use App\Models\ItemEvent;
use App\Models\User;
use DateTimeInterface;

/** Append-only History rows. Submitted uses the item clock so seeder backdates match Created. */
final class ItemTimeline
{
    public static function record(
        Item $item,
        User $actor,
        ItemEventKind $kind,
        ?string $decision = null,
        ?string $note = null,
        ?DateTimeInterface $at = null,
    ): ItemEvent {
        $createdAt = $at
            ?? ($kind === ItemEventKind::Submitted ? $item->created_at : null)
            ?? now();

        return ItemEvent::query()->create([
            'item_id' => $item->id,
            'actor_id' => $actor->id,
            'kind' => $kind->value,
            'decision' => $decision,
            'note' => $note,
            'snapshot_title' => $item->title,
            'snapshot_description' => $item->description,
            'snapshot_risk' => $item->risk,
            'snapshot_risk_score' => $item->risk_score,
            'snapshot_flags' => $item->flags,
            'snapshot_confidence' => $item->confidence,
            'snapshot_suggested_decision' => $item->suggested_decision,
            'created_at' => $createdAt,
        ]);
    }
}
