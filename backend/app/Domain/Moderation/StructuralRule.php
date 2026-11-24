<?php

namespace App\Domain\Moderation;

/** Caps / tiny titles — extra score, not a reject by themselves. XSS is SecurityRule. */
final class StructuralRule implements ModerationRule
{
    public function evaluate(string $title, string $description): array
    {
        $flags = [];
        $combined = $title.$description;
        $letters = preg_replace('/[^\p{L}]+/u', '', $combined) ?? '';
        $letterCount = mb_strlen($letters);

        if ($letterCount > 0) {
            $upper = preg_replace('/[^\p{Lu}]+/u', '', $letters) ?? '';
            if ((mb_strlen($upper) / $letterCount) > 0.60) {
                $flags[] = new HeuristicFlag(
                    'structural:excessive_caps',
                    20,
                    'More than 60% uppercase letters in combined title + description. May indicate aggressive or low-quality content.',
                );
            }
        }

        if (mb_strlen(trim($title)) < 5) {
            $flags[] = new HeuristicFlag(
                'structural:title_too_short',
                15,
                'Title has fewer than 5 characters.',
            );
        }

        return $flags;
    }
}
