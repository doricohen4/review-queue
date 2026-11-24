<?php

namespace App\Domain\Moderation;

/**
 * Shared scan for "word in a hash map" rules (keywords, profanity).
 * Not a Laravel service — no HTTP. Structural/XSS don't belong here
 * (they don't tokenize the same way).
 */
final class TokenMapScanner
{
    public static function haystack(string $title, string $description): string
    {
        return mb_strtolower($title.' '.$description);
    }

    /**
     * @param  array<string, array{weight: int, reason: string}>  $map
     * @return list<HeuristicFlag>
     */
    public static function matchTokens(string $haystack, array $map, string $keyPrefix): array
    {
        if ($map === []) {
            return [];
        }

        $flags = [];
        $seen = [];

        foreach (preg_split('/[^\p{L}\p{N}]+/u', $haystack, -1, PREG_SPLIT_NO_EMPTY) ?: [] as $token) {
            if (isset($seen[$token]) || ! isset($map[$token])) {
                continue;
            }

            $seen[$token] = true;
            $meta = $map[$token];
            $flags[] = new HeuristicFlag($keyPrefix.$token, $meta['weight'], $meta['reason']);
        }

        return $flags;
    }

    /**
     * Multi-word needles (e.g. "delete all") — substring, not tokens.
     *
     * @param  array<string, array{weight: int, reason: string}>  $phrases
     * @return list<HeuristicFlag>
     */
    public static function matchPhrases(string $haystack, array $phrases, string $keyPrefix): array
    {
        $flags = [];

        foreach ($phrases as $phrase => $meta) {
            if (str_contains($haystack, $phrase)) {
                $flags[] = new HeuristicFlag($keyPrefix.$phrase, $meta['weight'], $meta['reason']);
            }
        }

        return $flags;
    }
}
