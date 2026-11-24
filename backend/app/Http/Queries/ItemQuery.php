<?php

namespace App\Http\Queries;

use App\Enums\ItemStatus;
use App\Enums\RiskLevel;
use App\Models\Item;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Allow-listed list query. Unknown filter[] / sort → 422.
 * item (open row) is UI-only and never reaches SQL.
 */
final class ItemQuery
{
    private const PER_PAGE_DEFAULT = 15;

    private const PER_PAGE_MAX = 50;

    /**
     * Allow-listed filter keys and the WHERE each one applies.
     *
     * @return array<string, \Closure(Builder<Item>, mixed): void>
     */
    private function filters(): array
    {
        return [
            'status' => fn (Builder $query, mixed $value) => $this->whereInList($query, 'status', $value),
            'risk' => fn (Builder $query, mixed $value) => $this->whereInList($query, 'risk', $value),
            'submitter' => fn (Builder $query, mixed $value) => $this->whereInList($query, 'submitter_id', $value),
            'created_after' => fn (Builder $query, mixed $value) => $query->where('created_at', '>=', $this->dayBound($value, false)),
            'created_before' => fn (Builder $query, mixed $value) => $query->where('created_at', '<=', $this->dayBound($value, true)),
        ];
    }

    /**
     * Allow-listed sort keys (column + direction + toolbar label).
     *
     * @return array<string, array{column: string, direction: string, label: string}>
     */
    private function sorts(): array
    {
        return [
            '-created_at' => ['column' => 'created_at', 'direction' => 'desc', 'label' => 'Newest'],
            'created_at' => ['column' => 'created_at', 'direction' => 'asc', 'label' => 'Oldest'],
            '-risk_score' => ['column' => 'risk_score', 'direction' => 'desc', 'label' => 'Highest risk'],
            'risk_score' => ['column' => 'risk_score', 'direction' => 'asc', 'label' => 'Lowest risk'],
            'title' => ['column' => 'title', 'direction' => 'asc', 'label' => 'Title A–Z'],
            '-title' => ['column' => 'title', 'direction' => 'desc', 'label' => 'Title Z–A'],
            '-updated_at' => ['column' => 'updated_at', 'direction' => 'desc', 'label' => 'Recently updated'],
            'updated_at' => ['column' => 'updated_at', 'direction' => 'asc', 'label' => 'Least recently updated'],
        ];
    }

    /**
     * Build the list query from the URL and return one page.
     *
     * @return LengthAwarePaginator<int, Item>
     */
    public function paginate(Request $request): LengthAwarePaginator
    {
        $this->assertKnown($request);

        $query = Item::query()->with(['submitter', 'latestComment.reviewer']);

        $q = $request->query('q');
        if (is_string($q) && $q !== '') {
            $like = '%'.$q.'%';
            $query->where(function (Builder $inner) use ($like): void {
                $inner->where('title', 'like', $like)
                    ->orWhere('description', 'like', $like);
            });
        }

        $filters = $request->query('filter', []);
        if (is_array($filters)) {
            foreach ($this->filters() as $key => $apply) {
                if (! array_key_exists($key, $filters) || $filters[$key] === '' || $filters[$key] === null) {
                    continue;
                }
                $apply($query, $filters[$key]);
            }
        }

        $sortKey = $request->query('sort', '-created_at');
        $sorts = $this->sorts();
        $sort = is_string($sortKey) && isset($sorts[$sortKey])
            ? $sorts[$sortKey]
            : $sorts['-created_at'];
        $query->orderBy($sort['column'], $sort['direction'])
            ->orderBy('id', $sort['direction']);

        return $query->paginate($this->perPage($request))->withQueryString();
    }

    /**
     * Filter/sort options for the toolbar — same keys paginate() accepts.
     *
     * @return array{status: list<array{value: string, label: string}>, risk: list<array{value: string, label: string}>, sort: list<array{value: string, label: string}>, submitter: list<array{value: string, label: string}>}
     */
    public function catalog(): array
    {
        return [
            'status' => array_map(
                fn (ItemStatus $status) => [
                    'value' => $status->value,
                    'label' => ucwords(str_replace('_', ' ', $status->value)),
                ],
                ItemStatus::cases(),
            ),
            'risk' => array_map(
                fn (RiskLevel $risk) => [
                    'value' => $risk->value,
                    'label' => ucfirst($risk->value),
                ],
                RiskLevel::cases(),
            ),
            'sort' => array_map(
                fn (string $value, array $sort) => ['value' => $value, 'label' => $sort['label']],
                array_keys($this->sorts()),
                $this->sorts(),
            ),
            'submitter' => User::query()
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn (User $user) => [
                    'value' => (string) $user->id,
                    'label' => $user->name,
                ])
                ->all(),
        ];
    }

    /** 422 if filter[] or sort is not on the allow-list (item is ignored). */
    private function assertKnown(Request $request): void
    {
        $filters = $request->query('filter', []);
        if ($filters !== [] && $filters !== null && ! is_array($filters)) {
            throw ValidationException::withMessages([
                'filter' => 'filter must be an object of known keys.',
            ]);
        }

        if (is_array($filters)) {
            $unknown = array_diff(array_keys($filters), array_keys($this->filters()));
            if ($unknown !== []) {
                throw ValidationException::withMessages([
                    'filter' => 'Unknown filter: '.implode(', ', $unknown),
                ]);
            }
        }

        $sort = $request->query('sort');
        if (is_string($sort) && $sort !== '' && ! isset($this->sorts()[$sort])) {
            throw ValidationException::withMessages([
                'sort' => 'Unknown sort: '.$sort,
            ]);
        }
    }

    /**
     * Comma-separated (`pending,needs_work`) or array filter values → WHERE IN.
     *
     * @param  Builder<Item>  $query
     */
    private function whereInList(Builder $query, string $column, mixed $value): void
    {
        $values = $this->listValues($value);
        if ($values === []) {
            return;
        }

        $query->whereIn($column, $values);
    }

    /** @return list<string> */
    private function listValues(mixed $value): array
    {
        if (is_array($value)) {
            $parts = $value;
        } elseif (is_string($value)) {
            $parts = explode(',', $value);
        } elseif (is_int($value)) {
            $parts = [(string) $value];
        } else {
            return [];
        }

        return array_values(array_filter(
            array_map(static fn (mixed $part): string => trim((string) $part), $parts),
            static fn (string $part): bool => $part !== '',
        ));
    }

    /** Inclusive calendar-day bound so a YYYY-MM-DD filter covers the whole day. */
    private function dayBound(mixed $value, bool $endOfDay): string
    {
        $raw = is_string($value) ? $value : '';
        $day = strlen($raw) >= 10 ? substr($raw, 0, 10) : $raw;

        return $endOfDay ? $day.' 23:59:59' : $day.' 00:00:00';
    }

    /** Page size from ?per_page=; default 15, max 50. */
    private function perPage(Request $request): int
    {
        $raw = $request->query('per_page');
        if ($raw === null || $raw === '') {
            return self::PER_PAGE_DEFAULT;
        }

        $perPage = filter_var($raw, FILTER_VALIDATE_INT);
        if ($perPage === false || $perPage < 1 || $perPage > self::PER_PAGE_MAX) {
            throw ValidationException::withMessages([
                'per_page' => 'per_page must be an integer between 1 and '.self::PER_PAGE_MAX.'.',
            ]);
        }

        return $perPage;
    }
}
