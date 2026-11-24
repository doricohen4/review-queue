<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['item_id', 'reviewer_id', 'decision', 'risk', 'note'])]
class Review extends Model
{
    public const UPDATED_AT = null;

    /** The queue row this decision is about. */
    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    /** Persona who approved / rejected / sent back. */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewer_id');
    }
}
