<?php

namespace App\Domain\Moderation;

/** One finding we show the reviewer — key, points, and why. */
readonly class HeuristicFlag
{
    /** One finding: machine key, points, English reason. */
    public function __construct(
        public string $key,
        public int $weight,
        public string $reason,
    ) {}

    /**
     * Persist / JSON shape for the flags column.
     *
     * @return array{key: string, weight: int, reason: string}
     */
    public function toArray(): array
    {
        return [
            'key' => $this->key,
            'weight' => $this->weight,
            'reason' => $this->reason,
        ];
    }
}
