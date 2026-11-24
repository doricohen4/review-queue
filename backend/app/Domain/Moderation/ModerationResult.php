<?php

namespace App\Domain\Moderation;

use App\Enums\RiskLevel;

readonly class ModerationResult
{
    /**
     * Aggregated heuristic snapshot stored on the item.
     *
     * @param  list<HeuristicFlag>  $flags
     */
    public function __construct(
        public int $riskScore,
        public RiskLevel $risk,
        public string $suggestedDecision,
        public string $confidence,
        public array $flags,
    ) {}

    /**
     * Flag keys only — handy in Pest without walking the DTO list.
     *
     * @return list<string>
     */
    public function flagKeys(): array
    {
        return array_map(fn (HeuristicFlag $flag) => $flag->key, $this->flags);
    }
}
