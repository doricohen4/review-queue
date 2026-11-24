<?php

namespace App\Http\Resources;

use App\Models\Item;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Item
 */
class ItemResource extends JsonResource
{
    /**
     * JSON shape for one queue row (submitter only if the query loaded it).
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'status' => $this->status,
            'risk' => $this->risk,
            'risk_score' => $this->risk_score,
            'flags' => $this->flags,
            'confidence' => $this->confidence,
            'suggested_decision' => $this->suggested_decision,
            'submitter' => $this->whenLoaded('submitter', fn () => [
                'id' => $this->submitter->id,
                'name' => $this->submitter->name,
            ]),
            'latest_comment' => $this->latestComment === null ? null : [
                'note' => $this->latestComment->note,
                'reviewer_name' => $this->latestComment->reviewer?->name,
            ],
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
