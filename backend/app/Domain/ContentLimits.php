<?php

namespace App\Domain;

/**
 * Hard caps for anything we persist. Same numbers in the migration and
 * (later) FormRequest — don't let HTTP accept 2MB then blow up on VARCHAR.
 *
 * Short posts / tickets / reports, not a novel. Product can raise these;
 * don't silently switch description to unbounded TEXT.
 */
final class ContentLimits
{
    /** Headline — already VARCHAR(120) from day one. */
    public const TITLE_MAX = 120;

    /** Body. ~800–1000 words. VARCHAR, not TEXT, so the DB agrees with validation. */
    public const DESCRIPTION_MAX = 5000;

    /** Reviewer comment per cycle (needs_work note). */
    public const NOTE_MAX = 2000;

    /** Persona display name / name_key — users.name VARCHAR. */
    public const NAME_MAX = 60;
}
