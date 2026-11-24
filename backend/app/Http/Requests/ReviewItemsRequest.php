<?php

namespace App\Http\Requests;

use App\Domain\ContentLimits;
use App\Enums\ItemStatus;
use App\Enums\RiskLevel;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReviewItemsRequest extends FormRequest
{
    /** No auth in the demo — reviewer is a persona name. */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Body must be valid before the per-id loop (otherwise 422, not 207).
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer'],
            'decision' => ['required', 'string', Rule::in([
                ItemStatus::Approved->value,
                ItemStatus::Rejected->value,
                ItemStatus::NeedsWork->value,
            ])],
            'risk' => ['nullable', 'string', Rule::enum(RiskLevel::class)],
            'note' => ['nullable', 'string', 'max:'.ContentLimits::NOTE_MAX],
            'reviewer_name' => ['required', 'string', 'max:'.ContentLimits::NAME_MAX],
        ];
    }
}
