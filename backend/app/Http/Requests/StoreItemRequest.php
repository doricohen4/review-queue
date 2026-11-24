<?php

namespace App\Http\Requests;

use App\Domain\ContentLimits;
use Illuminate\Foundation\Http\FormRequest;

class StoreItemRequest extends FormRequest
{
    /** No auth in the demo — anyone may submit as a persona name. */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Title/description caps match ContentLimits (same as the VARCHAR columns).
     *
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:'.ContentLimits::TITLE_MAX],
            'description' => ['required', 'string', 'max:'.ContentLimits::DESCRIPTION_MAX],
            'submitter_name' => ['required', 'string', 'max:'.ContentLimits::NAME_MAX],
        ];
    }
}
