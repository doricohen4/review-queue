<?php

namespace App\Domain\Moderation;

use App\Enums\RiskLevel;

readonly class ModerationResult
{
    /**
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
     * @return list<string>
     */
    public function flagKeys(): array
    {
        return array_map(fn (HeuristicFlag $flag) => $flag->key, $this->flags);
    }
}
