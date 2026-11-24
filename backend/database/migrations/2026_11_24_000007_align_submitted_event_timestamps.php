<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /** Submitted history should match items.created_at (seeder/backfill used now()). */
    public function up(): void
    {
        DB::update(
            'update item_events set created_at = (select created_at from items where items.id = item_events.item_id) where kind = ?',
            ['submitted'],
        );
    }

    public function down(): void
    {
        //
    }
};
