<?php

namespace App\Domain\Moderation;

use App\Enums\RiskLevel;

final class ModerationPipeline
{
    /**
     * Ordered list of rules to run; default() is the production set.
     *
     * @param  list<ModerationRule>  $rules
     */
    public function __construct(
        private readonly array $rules,
    ) {}

    /** Built-in rules (keyword, structural, security, empty profanity). */
    public static function default(): self
    {
        return new self([
            new KeywordRule,
            new StructuralRule,
            new SecurityRule,
            new ProfanityRule,
        ]);
    }

    /** Run every rule, cap score at 100, derive risk / suggestion / confidence. */
    public function evaluate(string $title, string $description): ModerationResult
    {
        $flags = [];

        foreach ($this->rules as $rule) {
            foreach ($rule->evaluate($title, $description) as $flag) {
                $flags[] = $flag;
            }
        }

        $score = min(100, array_sum(array_map(fn (HeuristicFlag $flag) => $flag->weight, $flags)));
        $risk = $this->riskFor($score);

        return new ModerationResult(
            riskScore: $score,
            risk: $risk,
            suggestedDecision: $score >= 60 ? 'reject' : 'approve',
            confidence: $this->confidence($flags),
            flags: $flags,
        );
    }

    /** Map 0–100 onto low / medium / high / critical. */
    private function riskFor(int $score): RiskLevel
    {
        return match (true) {
            $score >= 85 => RiskLevel::Critical,
            $score >= 60 => RiskLevel::High,
            $score >= 30 => RiskLevel::Medium,
            default => RiskLevel::Low,
        };
    }

    /**
     * How sure we are: one weak flag is low; a heavy flag or 3+ flags is high.
     *
     * @param  list<HeuristicFlag>  $flags
     */
    private function confidence(array $flags): string
    {
        $count = count($flags);
        $maxWeight = $count === 0 ? 0 : max(array_map(fn (HeuristicFlag $flag) => $flag->weight, $flags));
        $onlyStructural = $count > 0 && ! array_filter(
            $flags,
            fn (HeuristicFlag $flag) => ! str_starts_with($flag->key, 'structural:'),
        );

        if ($maxWeight >= 60 || $count >= 3) {
            return 'high';
        }

        // One weak flag (or none / only structural) is not enough to be sure.
        if ($onlyStructural || $count <= 1) {
            return 'low';
        }

        return 'medium';
    }
}
