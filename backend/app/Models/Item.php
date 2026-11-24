<?php

namespace App\Models;

use App\Enums\ItemEventKind;
use Database\Factories\ItemFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

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

    /** Submit / update / grade rows, oldest first in the panel History tab. */
    public function events(): HasMany
    {
        return $this->hasMany(ItemEvent::class);
    }

    /** Human grades. History in the panel is `events()`, not this relation. */
    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    /**
     * Newest reviewer note still open after the last submit / update.
     * History is item_events; this is only the outstanding send-back.
     */
    public function latestComment(): HasOne
    {
        $authorKinds = [
            ItemEventKind::Submitted->value,
            ItemEventKind::Revised->value,
            ItemEventKind::Resubmitted->value,
        ];

        return $this->hasOne(ItemEvent::class)->ofMany(
            ['id' => 'max'],
            function (Builder $query) use ($authorKinds): void {
                $query->where('kind', ItemEventKind::Reviewed->value)
                    ->whereNotNull('note')
                    ->where('note', '!=', '')
                    ->where('item_events.id', '>', function ($sub) use ($authorKinds): void {
                        $sub->from('item_events as author_events')
                            ->selectRaw('coalesce(max(author_events.id), 0)')
                            ->whereColumn('author_events.item_id', 'item_events.item_id')
                            ->whereIn('author_events.kind', $authorKinds);
                    });
            },
        );
    }
}
