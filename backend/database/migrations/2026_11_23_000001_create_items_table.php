<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('items', function (Blueprint $table) {
            $table->id();
            $table->string('title', 120);
            $table->text('description');
            $table->foreignId('submitter_id')->constrained('users');
            $table->string('status', 20)->default('pending');
            $table->string('risk', 10)->nullable();
            $table->unsignedTinyInteger('risk_score')->nullable();
            $table->json('flags')->nullable();
            $table->string('confidence', 10)->nullable();
            $table->string('suggested_decision', 10)->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('submitter_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('items');
    }
};
