<?php

use App\Domain\ContentLimits;
use App\Domain\Moderation\ModerationPipeline;
use App\Exceptions\CannotResubmitException;
use App\Exceptions\InvalidTransitionException;
use App\Models\Item;
use App\Services\ItemService;
use App\Services\ReviewService;

beforeEach(function () {
    $this->items = app(ItemService::class);
    $this->reviews = app(ReviewService::class);
    $this->pipeline = app(ModerationPipeline::class);
});

function flagKeys(Item $item): array
{
    return collect($item->flags)->pluck('key')->all();
}

it('stores the same snapshot the injected pipeline would compute', function () {
    $title = 'Math quiz template for grade 5';
    $description = 'Interactive quiz with adaptive difficulty for grade 5 mathematics.';

    $item = $this->items->submit($title, $description, 'Alice Johnson');
    $live = $this->pipeline->evaluate($title, $description);

    expect($item->status)->toBe('pending')
        ->and($item->risk_score)->toBe($live->riskScore)
        ->and($item->confidence)->toBe($live->confidence)
        ->and($item->suggested_decision)->toBe($live->suggestedDecision)
        ->and(flagKeys($item))->toBe($live->flagKeys());
});

it('lets Bob reject Alice password copy that the keyword rule flags', function () {
    $item = $this->items->submit(
        'Admin password reset',
        'Share credentials with the class.',
        'Alice Johnson',
    );

    expect($item->risk_score)->toBeGreaterThanOrEqual(60)
        ->and(flagKeys($item))->toContain('keyword:password')
        ->and(flagKeys($item))->toContain('keyword:credentials');

    $result = $this->reviews->review(
        [$item->id],
        'rejected',
        'critical',
        'Do not share passwords with students.',
        'Bob Smith',
    );

    expect($result['failed'])->toBe([])
        ->and($item->fresh()->status)->toBe('rejected');
});

it('sends XSS-shaped copy to needs_work, resubmits clean text, then approves', function () {
    $item = $this->items->submit(
        'Fun classroom widget',
        'Paste this: <script>alert(1)</script>',
        'Alice Johnson',
    );

    expect(flagKeys($item))->toContain('security:script_tag')
        ->and($item->suggested_decision)->toBe('reject');

    $this->reviews->review(
        [$item->id],
        'needs_work',
        'high',
        'Remove the script tag before this can go to students.',
        'Bob Smith',
    );

    expect($item->fresh()->status)->toBe('needs_work');

    $clean = $this->items->resubmit(
        $item->fresh(),
        'Fun classroom widget',
        'A static diagram of the water cycle. No embedded scripts.',
        'Alice Johnson',
    );

    expect($clean->status)->toBe('pending')
        ->and(flagKeys($clean))->not->toContain('security:script_tag');

    $result = $this->reviews->review([$clean->id], 'approved', 'low', null, 'Bob Smith');

    expect($result['failed'])->toBe([])
        ->and($clean->fresh()->status)->toBe('approved');
});

it('rejects delete-all language after scoring it high', function () {
    $item = $this->items->submit(
        'Please delete all old worksheets',
        'Remove previous materials from the library.',
        'Alice Johnson',
    );

    expect(flagKeys($item))->toContain('keyword:delete all')
        ->and($item->risk_score)->toBeGreaterThanOrEqual(60);

    $this->reviews->review([$item->id], 'rejected', null, null, 'Bob Smith');

    expect($item->fresh()->status)->toBe('rejected');
});

it('approves structural noise that is below the reject threshold', function () {
    $item = $this->items->submit(
        'Hi',
        'THIS DESCRIPTION IS ALSO LOUD AND LONG ENOUGH FOR CLASS',
        'Alice Johnson',
    );

    expect(flagKeys($item))->toContain('structural:title_too_short')
        ->and(flagKeys($item))->toContain('structural:excessive_caps')
        ->and($item->suggested_decision)->toBe('approve');

    $this->reviews->review([$item->id], 'approved', null, null, 'Bob Smith');

    expect($item->fresh()->status)->toBe('approved');
});

it('rescored resubmit picks up a new password keyword', function () {
    $item = $this->items->submit(
        'Lab worksheet',
        'Normal classroom experiment.',
        'Alice Johnson',
    );

    $this->reviews->review(
        [$item->id],
        'needs_work',
        null,
        'Clarify how students log in.',
        'Bob Smith',
    );

    $again = $this->items->resubmit(
        $item->fresh(),
        'Lab worksheet login',
        'Students use the admin password on the shared sheet.',
        'Alice Johnson',
    );

    expect($again->status)->toBe('pending')
        ->and(flagKeys($again))->toContain('keyword:password')
        ->and($again->risk_score)->toBeGreaterThanOrEqual(60);
});

it('cannot approve while the item is still in needs_work', function () {
    $item = $this->items->submit('Quiz', 'Grade 4 fractions.', 'Alice Johnson');

    $this->reviews->review([$item->id], 'needs_work', null, 'Add an answer key.', 'Bob Smith');

    $result = $this->reviews->review([$item->id], 'approved', null, null, 'Bob Smith');

    expect($result['failed'][0]['reason'])->toBe('invalid_transition')
        ->and($item->fresh()->status)->toBe('needs_work');
});

it('cannot review again after approve', function () {
    $item = $this->items->submit('Quiz', 'Grade 4 fractions.', 'Alice Johnson');

    $this->reviews->review([$item->id], 'approved', null, null, 'Bob Smith');
    $result = $this->reviews->review([$item->id], 'rejected', null, null, 'Bob Smith');

    expect($result['failed'][0]['reason'])->toBe('invalid_transition')
        ->and($item->fresh()->status)->toBe('approved');
});

it('cannot resubmit after reject', function () {
    $item = $this->items->submit('Quiz', 'Grade 4 fractions.', 'Alice Johnson');

    $this->reviews->review([$item->id], 'rejected', null, null, 'Bob Smith');

    expect(fn () => $this->items->resubmit(
        $item->fresh(),
        'Quiz v2',
        'Still fractions.',
        'Alice Johnson',
    ))->toThrow(InvalidTransitionException::class);
});

it('refuses resubmit from someone who is not the submitter', function () {
    $item = $this->items->submit('Quiz', 'Grade 4 fractions.', 'Alice Johnson');
    $this->reviews->review([$item->id], 'needs_work', null, 'Fix copy.', 'Bob Smith');

    expect(fn () => $this->items->resubmit(
        $item->fresh(),
        'Quiz v2',
        'Still fractions.',
        'Bob Smith',
    ))->toThrow(CannotResubmitException::class);
});

it('rejects submit when title, description, or submitter_name is missing', function (array $body) {
    $this->postJson('/api/items', $body)->assertUnprocessable();
})->with([
    'no title' => [['description' => 'Body copy.', 'submitter_name' => 'Alice Johnson']],
    'no description' => [['title' => 'Quiz', 'submitter_name' => 'Alice Johnson']],
    'no submitter' => [['title' => 'Quiz', 'description' => 'Body copy.']],
]);

it('allows approve without note or risk but requires a note for needs_work', function () {
    $pending = $this->items->submit('Quiz', 'Grade 4 fractions.', 'Alice Johnson');

    $this->postJson('/api/items/review', [
        'ids' => [$pending->id],
        'decision' => 'approved',
        'reviewer_name' => 'Bob Smith',
    ])->assertOk();

    $needsWork = $this->items->submit('Another quiz', 'Grade 5 decimals.', 'Alice Johnson');

    $this->postJson('/api/items/review', [
        'ids' => [$needsWork->id],
        'decision' => 'needs_work',
        'reviewer_name' => 'Bob Smith',
    ])->assertUnprocessable();

    $this->postJson('/api/items/review', [
        'ids' => [$needsWork->id],
        'decision' => 'needs_work',
        'note' => 'Add worked examples.',
        'reviewer_name' => 'Bob Smith',
    ])->assertOk();
});

it('rejects review when mandatory fields are missing or invalid', function (array $body) {
    $item = $this->items->submit('Quiz', 'Grade 4 fractions.', 'Alice Johnson');

    $this->postJson('/api/items/review', array_merge([
        'ids' => [$item->id],
        'decision' => 'approved',
        'reviewer_name' => 'Bob Smith',
    ], $body))->assertUnprocessable();
})->with([
    'no reviewer' => [['reviewer_name' => null]],
    'no decision' => [['decision' => null]],
    'unknown decision' => [['decision' => 'pending']],
    'bad risk' => [['risk' => 'extreme']],
    'note too long' => [['note' => str_repeat('x', ContentLimits::NOTE_MAX + 1)]],
]);

it('rejects resubmit when title or description is missing', function (string $omit) {
    $item = $this->items->submit('Quiz', 'Grade 4 fractions.', 'Alice Johnson');
    $this->reviews->review([$item->id], 'needs_work', null, 'Fix copy.', 'Bob Smith');

    $body = [
        'title' => 'Quiz v2',
        'description' => 'Updated fractions.',
        'submitter_name' => 'Alice Johnson',
    ];
    unset($body[$omit]);

    $this->postJson("/api/items/{$item->id}/resubmit", $body)->assertUnprocessable();
})->with(['title', 'description', 'submitter_name']);
