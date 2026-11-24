<?php

namespace Database\Seeders;

use App\Domain\Moderation\HeuristicFlag;
use App\Domain\Moderation\ModerationPipeline;
use App\Models\Item;
use App\Models\Review;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class DemoSeeder extends Seeder
{
    /** Queue rows for the mockup. Heuristic fields come from ModerationPipeline unless sparse. */
    public function run(): void
    {
        $names = [
            'Alice Johnson',
            'Bob Smith',
            'Carol Williams',
            'Dana Cole',
            'Tom Kim',
            'Sara Rodriguez',
            'Maria Lopez',
            'Nina Katz',
            'John D.',
            'Paul W.',
            'Elena Park',
            'Diego Alvarez',
            'Priya Shah',
        ];

        $users = collect($names)->mapWithKeys(function (string $name) {
            $user = User::query()->updateOrCreate(
                ['name_key' => User::nameKey($name)],
                ['name' => $name],
            );

            return [$name => $user];
        });

        $now = Carbon::now();
        $pipeline = ModerationPipeline::default();

        $items = [
            [
                'title' => 'Login page redesign proposal',
                'description' => 'New design for the student login experience with improved accessibility. Includes updated color contrast ratios, larger touch targets for mobile devices, and simplified form flow with progressive disclosure.',
                'submitter' => 'Alice Johnson',
                'status' => 'pending',
                'created_at' => $now->copy()->subHours(2),
                'updated_at' => $now->copy()->subMinutes(20),
            ],
            [
                'title' => 'Admin password reset workflow',
                'description' => 'Share admin credentials with students for classroom setup of the password reset workflow.',
                'submitter' => 'Tom Kim',
                'status' => 'pending',
                'created_at' => $now->copy()->subHours(3),
            ],
            [
                'title' => 'Math quiz template for grade 5',
                'description' => 'Interactive quiz template with adaptive difficulty for grade 5 mathematics.',
                'submitter' => 'Sara Rodriguez',
                'status' => 'pending',
                'created_at' => $now->copy()->subHours(5),
            ],
            [
                'title' => 'Science experiment safety guide',
                'description' => 'Reviewer requested clearer safety warnings for classroom science experiments.',
                'submitter' => 'Maria Lopez',
                'status' => 'needs_work',
                'note' => 'Add clearer safety warnings for classroom experiments.',
                'created_at' => $now->copy()->subDay(),
                'updated_at' => $now->copy()->subHours(6),
            ],
            [
                'title' => 'Reading comprehension worksheet',
                'description' => 'Grade 3 reading exercises with vocabulary support and short-answer prompts.',
                'submitter' => 'Alice Johnson',
                'status' => 'approved',
                'created_at' => $now->copy()->subDays(2),
            ],
            [
                'title' => 'URGENT: Delete all old content NOW',
                'description' => 'Instructions to remove all previous materials from the student library immediately.',
                'submitter' => 'John D.',
                'status' => 'rejected',
                'created_at' => $now->copy()->subDays(3),
            ],
            [
                'title' => 'Geography flashcard deck — continents',
                'description' => 'Visual flashcards covering all 7 continents for elementary geography.',
                'submitter' => 'Nina Katz',
                'status' => 'pending',
                'created_at' => $now->copy()->subDays(4),
            ],
            [
                'title' => 'Chemistry: Secret lab procedures',
                'description' => 'Advanced chemistry content with admin notes for the lab instructor.',
                'submitter' => 'Paul W.',
                'status' => 'pending',
                'created_at' => $now->copy()->subDays(5),
            ],
            [
                'title' => 'Just-submitted low-risk recap',
                'description' => 'Short recap of yesterday’s class for families.',
                'submitter' => 'Elena Park',
                'status' => 'pending',
                'created_at' => $now->copy()->subSeconds(40),
                'updated_at' => $now->copy()->subSeconds(40),
            ],
            [
                'title' => 'Draft with missing heuristic',
                'description' => '.',
                'submitter' => 'Diego Alvarez',
                'status' => 'pending',
                'created_at' => $now->copy()->subDays(8),
                'sparse' => true,
            ],
            [
                'title' => 'Unscored history timeline',
                'description' => 'Timeline of ancient civilizations for grade 6.',
                'submitter' => 'Priya Shah',
                'status' => 'pending',
                'created_at' => $now->copy()->subDays(9),
                'sparse' => true,
            ],
            [
                'title' => 'Cancelled duplicate worksheet',
                'description' => 'Duplicate of the reading worksheet, withdrawn by the submitter.',
                'submitter' => 'Alice Johnson',
                'status' => 'cancelled',
                'created_at' => $now->copy()->subDays(6),
            ],
            [
                'title' => 'Bob-owned pending quiz',
                'description' => 'Fractions warm-up Bob submitted so a reviewer persona can decide.',
                'submitter' => 'Bob Smith',
                'status' => 'pending',
                'created_at' => $now->copy()->subHours(1),
            ],
            [
                'title' => 'Dana dual-role writing prompt',
                'description' => 'Dana submitted this as a submitter; another reviewer should decide.',
                'submitter' => 'Dana Cole',
                'status' => 'pending',
                'created_at' => $now->copy()->subMinutes(50),
            ],
        ];

        $topics = [
            'Art collage instructions',
            'Music rhythm practice',
            'PE stretching routine',
            'Coding unplugged activity',
            'Spelling list week 12',
            'Fractions word problems',
            'Plant life cycle diagram',
            'Community helpers poster',
            'Map skills: compass rose',
            'Poetry reading night',
            'Field trip permission copy',
            'Substitute teacher notes',
            'Library checkout reminder',
            'Winter concert program',
            'Classroom jobs chart',
            'Number line to 100',
            'Weather journal template',
            'Healthy snack ideas',
            'Digital citizenship pledge',
            'Parent conference slots',
            'Sight words flash set',
            'Volume of a cube explainer',
            'Ancient Egypt vocabulary',
            'Recycling week poster',
        ];

        $statuses = ['pending', 'pending', 'pending', 'approved', 'rejected', 'needs_work'];

        foreach ($topics as $index => $title) {
            $items[] = [
                'title' => $title,
                'description' => $title.'. Classroom-ready copy for BrainPOP review.',
                'submitter' => $names[$index % count($names)],
                'status' => $statuses[$index % count($statuses)],
                'note' => $statuses[$index % count($statuses)] === 'needs_work'
                    ? 'Please add a worked example before this goes to students.'
                    : null,
                'created_at' => $now->copy()->subHours($index + 6),
                'updated_at' => $now->copy()->subHours(intdiv($index, 2) + 1),
            ];
        }

        foreach ($items as $row) {
            $submitter = $users[$row['submitter']];
            $sparse = (bool) ($row['sparse'] ?? false);
            $result = $sparse ? null : $pipeline->evaluate($row['title'], $row['description']);

            $item = Item::query()->updateOrCreate(
                ['title' => $row['title'], 'submitter_id' => $submitter->id],
                [
                    'description' => $row['description'],
                    'status' => $row['status'],
                    'risk' => $result?->risk->value,
                    'risk_score' => $result?->riskScore,
                    'flags' => $result === null
                        ? null
                        : array_map(fn (HeuristicFlag $flag) => $flag->toArray(), $result->flags),
                    'confidence' => $result?->confidence,
                    'suggested_decision' => $result?->suggestedDecision,
                ],
            );

            $item->timestamps = false;
            $item->forceFill([
                'created_at' => $row['created_at'],
                'updated_at' => $row['updated_at'] ?? $row['created_at'],
            ])->save();

            $note = $row['note'] ?? null;
            if (is_string($note) && $note !== '' && $item->reviews()->doesntExist()) {
                Review::query()->create([
                    'item_id' => $item->id,
                    'reviewer_id' => $users['Bob Smith']->id,
                    'decision' => 'needs_work',
                    'note' => $note,
                ]);
            }
        }
    }
}
