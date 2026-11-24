<?php

namespace Database\Seeders;

use App\Domain\Moderation\HeuristicFlag;
use App\Domain\Moderation\ModerationPipeline;
use App\Models\Item;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class DemoSeeder extends Seeder
{
    /** Queue rows for the mockup. Heuristic fields come from ModerationPipeline. */
    public function run(): void
    {
        $users = collect([
            'Alice Johnson',
            'Bob Smith',
            'Carol Williams',
            'Tom Kim',
            'Sara Rodriguez',
            'Maria Lopez',
            'Nina Katz',
            'John D.',
            'Paul W.',
        ])->mapWithKeys(function (string $name) {
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
                'created_at' => $now->copy()->subDay(),
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
        ];

        foreach ($items as $row) {
            $submitter = $users[$row['submitter']];
            $result = $pipeline->evaluate($row['title'], $row['description']);

            Item::query()->updateOrCreate(
                ['title' => $row['title'], 'submitter_id' => $submitter->id],
                [
                    'description' => $row['description'],
                    'status' => $row['status'],
                    'risk' => $result->risk->value,
                    'risk_score' => $result->riskScore,
                    'flags' => array_map(fn (HeuristicFlag $flag) => $flag->toArray(), $result->flags),
                    'confidence' => $result->confidence,
                    'suggested_decision' => $result->suggestedDecision,
                    'created_at' => $row['created_at'],
                    'updated_at' => $row['created_at'],
                ],
            );
        }
    }
}
