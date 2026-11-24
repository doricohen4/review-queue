<?php

namespace App\Domain\Moderation;

/**
 * Insults / adult language — WORD LIST IS DEFINED BY PRODUCT, not by engineering
 * guessing slurs into a public repo. Keep TERMS empty until they hand us a list
 * (or a config/table). Constructor exists so tests can inject a fake token.
 */
final class ProfanityRule implements ModerationRule
{
    /**
     * @var array<string, array{weight: int, reason: string}>
     */
    private const TERMS = [
        // Product fills this. Example shape:
        // 'example' => ['weight' => 40, 'reason' => 'On the product blocklist.'],
    ];

    /**
     * Default TERMS is empty; tests inject a fake list.
     *
     * @param  array<string, array{weight: int, reason: string}>  $terms
     */
    public function __construct(
        private readonly array $terms = self::TERMS,
    ) {}

    /** Flag tokens that appear on the (usually empty) product list. */
    public function evaluate(string $title, string $description): array
    {
        $haystack = TokenMapScanner::haystack($title, $description);

        return TokenMapScanner::matchTokens($haystack, $this->terms, 'profanity:');
    }
}
