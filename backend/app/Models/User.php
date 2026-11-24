<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'name_key'])]
class User extends Model
{
    /** @use HasFactory<UserFactory> */
    use HasFactory;

    /** Unique lookup key: trim, collapse spaces, lowercase. */
    public static function nameKey(string $name): string
    {
        $collapsed = preg_replace('/\s+/', ' ', trim($name)) ?? '';

        return mb_strtolower($collapsed);
    }

    /** Content this person submitted. */
    public function items(): HasMany
    {
        return $this->hasMany(Item::class, 'submitter_id');
    }

    /** Decisions this person made as a reviewer. */
    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class, 'reviewer_id');
    }
}
