<?php

namespace App\Http\Resources;

use App\Models\ItemEvent;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ItemEvent
 */
class ItemEventResource extends JsonResource
{
    /**
     * One audit row: author change or human grade, with copy frozen at that moment.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'kind' => $this->kind,
            'decision' => $this->decision,
            'note' => $this->note,
            'snapshot' => [
                'title' => $this->snapshot_title,
                'description' => $this->snapshot_description,
                'risk' => $this->snapshot_risk,
                'risk_score' => $this->snapshot_risk_score,
                'flags' => $this->snapshot_flags ?? [],
                'confidence' => $this->snapshot_confidence,
                'suggested_decision' => $this->snapshot_suggested_decision,
            ],
            'actor' => $this->whenLoaded('actor', fn () => [
                'id' => $this->actor->id,
                'name' => $this->actor->name,
            ]),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
