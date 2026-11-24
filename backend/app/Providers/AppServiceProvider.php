<?php

namespace App\Providers;

use App\Domain\Moderation\ModerationPipeline;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /** Bind the default moderation pipeline for ItemService. */
    public function register(): void
    {
        $this->app->singleton(ModerationPipeline::class, fn () => ModerationPipeline::default());
    }

    /** App boot — unused in the demo. */
    public function boot(): void
    {
        //
    }
}
