<?php

namespace App\Domain\Moderation;

/**
 * One heuristic rule — not a Laravel Gate/Policy (those are for "may this user approve?").
 * Follow-up "add a rule": new class, implement this, one line in ModerationPipeline::default().
 * evaluate() is the contract (same shape), not shared code — each rule decides what to look for.
 * Token maps share TokenMapScanner; caps/XSS stay in their own evaluate().
 */
interface ModerationRule
{
    /**
     * @return list<HeuristicFlag>
     */
    public function evaluate(string $title, string $description): array;
}
