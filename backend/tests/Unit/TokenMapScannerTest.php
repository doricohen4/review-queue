<?php

use App\Domain\Moderation\TokenMapScanner;

it('builds a lowercase haystack from title and description', function () {
    expect(TokenMapScanner::haystack('Hello', 'World'))->toBe('hello world');
});

it('matches tokens from a hash map in O(1) per word', function () {
    $map = [
        'password' => ['weight' => 60, 'reason' => 'credential'],
    ];

    $flags = TokenMapScanner::matchTokens('reset the password now', $map, 'keyword:');

    expect($flags)->toHaveCount(1);
    expect($flags[0]->key)->toBe('keyword:password');
    expect($flags[0]->weight)->toBe(60);
});

it('does not double-flag the same token', function () {
    $map = [
        'admin' => ['weight' => 25, 'reason' => 'admin'],
    ];

    $flags = TokenMapScanner::matchTokens('admin admin admin', $map, 'keyword:');

    expect($flags)->toHaveCount(1);
});

it('returns no flags when the map is empty', function () {
    expect(TokenMapScanner::matchTokens('anything at all', [], 'profanity:'))->toBe([]);
});

it('matches multi-word phrases as substrings', function () {
    $phrases = [
        'delete all' => ['weight' => 65, 'reason' => 'destructive'],
    ];

    $flags = TokenMapScanner::matchPhrases('please delete all old files', $phrases, 'keyword:');

    expect($flags)->toHaveCount(1);
    expect($flags[0]->key)->toBe('keyword:delete all');
});
