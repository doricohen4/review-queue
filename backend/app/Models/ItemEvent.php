<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'item_id',
    'actor_id',
    'kind',
    'decision',
    'note',
    'snapshot_title',
    'snapshot_description',
    'snapshot_risk',
    'snapshot_risk_score',
    'snapshot_flags',
    'snapshot_confidence',
    'snapshot_suggested_decision',
    'created_at',
])]
class ItemEvent extends Model
{
    public const UPDATED_AT = null;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'snapshot_flags' => 'array',
            'snapshot_risk_score' => 'integer',
        ];
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
