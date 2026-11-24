<?php

use App\Domain\Moderation\ModerationPipeline;
use App\Domain\Moderation\ProfanityRule;
use App\Domain\Moderation\SecurityRule;
use App\Domain\Moderation\StructuralRule;
use App\Enums\RiskLevel;

it('scores password at least 60 and adds a keyword flag', function () {
    $result = ModerationPipeline::default()->evaluate(
        'Admin password reset',
        'Share credentials with the class.',
    );

    expect($result->riskScore)->toBeGreaterThanOrEqual(60);
    expect($result->suggestedDecision)->toBe('reject');
    expect($result->flagKeys())->toContain('keyword:password');
});

it('flags embedded script tags as a security signal', function () {
    $result = ModerationPipeline::default()->evaluate(
        'Fun classroom widget',
        'Paste this: <script>alert(1)</script>',
    );

    expect($result->flagKeys())->toContain('security:script_tag');
    expect($result->riskScore)->toBeGreaterThanOrEqual(60);
    expect($result->suggestedDecision)->toBe('reject');
});

it('does not flag profanity until product fills the word list', function () {
    $result = ModerationPipeline::default()->evaluate(
        'Not a real slur in the repo',
        'The default ProfanityRule list is empty on purpose.',
    );

    $profanity = array_filter($result->flagKeys(), fn (string $key) => str_starts_with($key, 'profanity:'));

    expect($profanity)->toBeEmpty();
});

it('flags a term when the product list includes it', function () {
    $rule = new ProfanityRule([
        'bannedtoken' => [
            'weight' => 40,
            'reason' => 'On the product word list.',
        ],
    ]);

    $keys = array_map(
        fn ($flag) => $flag->key,
        $rule->evaluate('contains bannedtoken here', ''),
    );

    expect($keys)->toContain('profanity:bannedtoken');
});

it('treats a single weak keyword as low confidence', function () {
    $result = ModerationPipeline::default()->evaluate(
        'Please handle this urgent request',
        'Normal classroom copy about a math worksheet.',
    );

    expect($result->flagKeys())->toContain('keyword:urgent');
    expect($result->confidence)->toBe('low');
    expect($result->suggestedDecision)->toBe('approve');
});

it('caps the score at 100 and marks critical', function () {
    $result = ModerationPipeline::default()->evaluate(
        'Admin password reset workflow',
        'Share admin credentials with students.',
    );

    expect($result->riskScore)->toBe(100);
    expect($result->risk)->toBe(RiskLevel::Critical);
});

it('flags delete-all language as high risk', function () {
    $result = ModerationPipeline::default()->evaluate(
        'Please delete all old worksheets',
        'Remove previous materials from the library.',
    );

    expect($result->flagKeys())->toContain('keyword:delete all');
    expect($result->riskScore)->toBeGreaterThanOrEqual(60);
});

it('flags excessive caps and a tiny title', function () {
    $structural = new StructuralRule;

    $caps = $structural->evaluate('HELLO WORLD TITLE HERE', 'THIS DESCRIPTION IS ALSO LOUD AND LONG ENOUGH');
    expect(array_map(fn ($f) => $f->key, $caps))->toContain('structural:excessive_caps');

    $short = $structural->evaluate('Hi', 'A normal description for the classroom.');
    expect(array_map(fn ($f) => $f->key, $short))->toContain('structural:title_too_short');
});

it('flags javascript urls and inline handlers', function () {
    $security = new SecurityRule;

    $js = $security->evaluate('Link', 'Open javascript:alert(1)');
    expect(array_map(fn ($f) => $f->key, $js))->toContain('security:javascript_url');

    $handler = $security->evaluate('Img', '<img src=x onerror=alert(1)>');
    expect(array_map(fn ($f) => $f->key, $handler))->toContain('security:inline_handler');
});

it('keeps clean educational copy below the high-risk threshold', function () {
    $result = ModerationPipeline::default()->evaluate(
        'Math quiz template for grade 5',
        'Interactive quiz with adaptive difficulty for grade 5 mathematics.',
    );

    expect($result->riskScore)->toBeLessThan(60);
    expect($result->suggestedDecision)->toBe('approve');
});
