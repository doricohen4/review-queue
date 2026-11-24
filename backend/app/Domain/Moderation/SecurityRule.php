<?php

namespace App\Domain\Moderation;

/**
 * Minimum XSS-shaped markup in the submission — not a sanitizer.
 * Flag it for the reviewer; Vue still must not v-html this text.
 */
final class SecurityRule implements ModerationRule
{
    /**
     * @var array<string, array{key: string, weight: int, reason: string}>
     */
    private const NEEDLES = [
        '<script' => [
            'key' => 'security:script_tag',
            'weight' => 60,
            'reason' => 'Embedded <script> tag. Treat as executable content, not a normal submission.',
        ],
        'javascript:' => [
            'key' => 'security:javascript_url',
            'weight' => 60,
            'reason' => 'javascript: URL — typical XSS payload shape.',
        ],
        'onerror=' => [
            'key' => 'security:inline_handler',
            'weight' => 50,
            'reason' => 'Inline event handler (onerror=). Often used to run JS from markup.',
        ],
    ];

    public function evaluate(string $title, string $description): array
    {
        $haystack = mb_strtolower($title.' '.$description);
        $flags = [];

        foreach (self::NEEDLES as $needle => $meta) {
            if (str_contains($haystack, $needle)) {
                $flags[] = new HeuristicFlag($meta['key'], $meta['weight'], $meta['reason']);
            }
        }

        return $flags;
    }
}
