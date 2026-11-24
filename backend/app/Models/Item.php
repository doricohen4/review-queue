<?php

namespace App\Models;

use Database\Factories\ItemFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'title',
    'description',
    'submitter_id',
    'status',
    'risk',
    'risk_score',
    'flags',
    'confidence',
    'suggested_decision',
])]
class Item extends Model
{
    /** @use HasFactory<ItemFactory> */
    use HasFactory;

    /**
     * flags JSON ↔ array; risk_score stays an int.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'flags' => 'array',
            'risk_score' => 'integer',
        ];
    }

    /** Persona who submitted this row. */
    public function submitter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitter_id');
    }

    /** Append-only human decisions (audit timeline). */
    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }
}
