<?php

namespace App\Domain\Moderation;

/**
 * Educational / safety keywords — password, admin, delete all — not a swear filter.
 * Profanity/insults: don't dump a slur list in this public repo. That's a
 * ProfanityRule with a word list from the product later, registered in default().
 *
 * New token: add a row to TOKENS (O(1) lookup). Don't grow an if-else chain.
 */
final class KeywordRule implements ModerationRule
{
    /**
     * @var array<string, array{weight: int, reason: string}>
     */
    private const TOKENS = [
        'password' => [
            'weight' => 60,
            'reason' => 'Contains a sensitive credential term. A single hit alone crosses the high-risk threshold (≥60).',
        ],
        'credentials' => [
            'weight' => 60,
            'reason' => 'Contains a sensitive credential term. A single hit alone crosses the high-risk threshold (≥60).',
        ],
        'admin' => [
            'weight' => 25,
            'reason' => 'Administrative access reference detected.',
        ],
        'urgent' => [
            'weight' => 25,
            'reason' => 'Urgency signal detected. Common in legitimate requests — only significant when combined with other flags.',
        ],
        'secret' => [
            'weight' => 35,
            'reason' => 'Contains a sensitive term.',
        ],
        'asap' => [
            'weight' => 15,
            'reason' => 'Urgency signal. Weak on its own.',
        ],
        'immediately' => [
            'weight' => 15,
            'reason' => 'Urgency signal. Weak on its own.',
        ],
    ];

    /**
     * @var array<string, array{weight: int, reason: string}>
     */
    private const PHRASES = [
        'delete all' => [
            'weight' => 65,
            'reason' => 'Destructive action language detected.',
        ],
    ];

    /** Flag credential / urgency / destructive language via the token map. */
    public function evaluate(string $title, string $description): array
    {
        $haystack = TokenMapScanner::haystack($title, $description);

        return [
            ...TokenMapScanner::matchPhrases($haystack, self::PHRASES, 'keyword:'),
            ...TokenMapScanner::matchTokens($haystack, self::TOKENS, 'keyword:'),
        ];
    }
}
