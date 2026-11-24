<?php

use App\Domain\ContentLimits;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('item_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('item_id')->constrained('items');
            $table->foreignId('actor_id')->constrained('users');
            $table->string('kind', 20);
            $table->string('decision', 20)->nullable();
            $table->string('note', ContentLimits::NOTE_MAX)->nullable();
            $table->string('snapshot_title', ContentLimits::TITLE_MAX);
            $table->string('snapshot_description', ContentLimits::DESCRIPTION_MAX);
            $table->string('snapshot_risk', 10)->nullable();
            $table->unsignedTinyInteger('snapshot_risk_score')->nullable();
            $table->json('snapshot_flags')->nullable();
            $table->string('snapshot_confidence', 10)->nullable();
            $table->string('snapshot_suggested_decision', 10)->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('item_events');
    }
};
