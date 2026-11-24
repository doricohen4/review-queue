<?php

namespace Database\Seeders;

use App\Models\Item;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class DemoSeeder extends Seeder
{
    /**
     * Demo queue matching mockup-v2. Scores are fixtures until the moderation pipeline lands.
     *
     * TODO(prod): replace hardcoded heuristic fields with ModerationPipeline::evaluate().
     */
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

        $items = [
            [
                'title' => 'Login page redesign proposal',
                'description' => 'New design for the student login experience with improved accessibility. Includes updated color contrast ratios, larger touch targets for mobile devices, and simplified form flow with progressive disclosure.',
                'submitter' => 'Alice Johnson',
                'status' => 'pending',
                'risk' => 'medium',
                'risk_score' => 45,
                'confidence' => 'medium',
                'suggested_decision' => 'approve',
                'flags' => [
                    ['key' => 'keyword:urgent', 'weight' => 20, 'reason' => 'Urgency signal detected. Common in legitimate requests — only significant when combined with other flags.'],
                    ['key' => 'structural:excessive_caps', 'weight' => 25, 'reason' => 'More than 60% uppercase letters in combined title + description. May indicate aggressive or low-quality content.'],
                ],
                'created_at' => $now->copy()->subHours(2),
            ],
            [
                'title' => 'Admin password reset workflow',
                'description' => 'Share admin credentials with students for classroom setup of the password reset workflow.',
                'submitter' => 'Tom Kim',
                'status' => 'pending',
                'risk' => 'critical',
                'risk_score' => 85,
                'confidence' => 'high',
                'suggested_decision' => 'reject',
                'flags' => [
                    ['key' => 'keyword:password', 'weight' => 60, 'reason' => 'Contains a sensitive credential term. A single hit alone crosses the high-risk threshold (≥60).'],
                    ['key' => 'keyword:admin', 'weight' => 25, 'reason' => 'Administrative access reference detected.'],
                ],
                'created_at' => $now->copy()->subHours(3),
            ],
            [
                'title' => 'Math quiz template for grade 5',
                'description' => 'Interactive quiz template with adaptive difficulty for grade 5 mathematics.',
                'submitter' => 'Sara Rodriguez',
                'status' => 'in_review',
                'risk' => 'low',
                'risk_score' => 12,
                'confidence' => 'high',
                'suggested_decision' => 'approve',
                'flags' => [],
                'created_at' => $now->copy()->subHours(5),
            ],
            [
                'title' => 'Science experiment safety guide',
                'description' => 'Reviewer requested clearer safety warnings for classroom science experiments.',
                'submitter' => 'Maria Lopez',
                'status' => 'needs_work',
                'risk' => 'medium',
                'risk_score' => 38,
                'confidence' => 'low',
                'suggested_decision' => 'approve',
                'flags' => [
                    ['key' => 'keyword:urgent', 'weight' => 20, 'reason' => 'Urgency signal in title. In a safety guide this may be intentional.'],
                    ['key' => 'structural:excessive_caps', 'weight' => 18, 'reason' => 'Moderate uppercase usage detected.'],
                ],
                'created_at' => $now->copy()->subDay(),
            ],
            [
                'title' => 'Reading comprehension worksheet',
                'description' => 'Grade 3 reading exercises with vocabulary support and short-answer prompts.',
                'submitter' => 'Alice Johnson',
                'status' => 'approved',
                'risk' => 'low',
                'risk_score' => 8,
                'confidence' => 'high',
                'suggested_decision' => 'approve',
                'flags' => [],
                'created_at' => $now->copy()->subDays(2),
            ],
            [
                'title' => 'URGENT: Delete all old content NOW',
                'description' => 'Instructions to remove all previous materials from the student library immediately.',
                'submitter' => 'John D.',
                'status' => 'rejected',
                'risk' => 'critical',
                'risk_score' => 90,
                'confidence' => 'high',
                'suggested_decision' => 'reject',
                'flags' => [
                    ['key' => 'keyword:delete all', 'weight' => 65, 'reason' => 'Destructive action language detected.'],
                    ['key' => 'keyword:urgent', 'weight' => 20, 'reason' => 'Urgency signal in title.'],
                    ['key' => 'structural:excessive_caps', 'weight' => 5, 'reason' => 'Title is fully uppercase.'],
                ],
                'created_at' => $now->copy()->subDays(3),
            ],
            [
                'title' => 'Geography flashcard deck — continents',
                'description' => 'Visual flashcards covering all 7 continents for elementary geography.',
                'submitter' => 'Nina Katz',
                'status' => 'pending',
                'risk' => 'low',
                'risk_score' => 5,
                'confidence' => 'high',
                'suggested_decision' => 'approve',
                'flags' => [],
                'created_at' => $now->copy()->subDays(4),
            ],
            [
                'title' => 'Chemistry: Secret lab procedures',
                'description' => 'Advanced chemistry content with admin notes for the lab instructor.',
                'submitter' => 'Paul W.',
                'status' => 'pending',
                'risk' => 'high',
                'risk_score' => 70,
                'confidence' => 'high',
                'suggested_decision' => 'reject',
                'flags' => [
                    ['key' => 'keyword:secret', 'weight' => 35, 'reason' => 'Contains a sensitive term.'],
                    ['key' => 'keyword:admin', 'weight' => 25, 'reason' => 'Administrative access reference.'],
                    ['key' => 'structural:excessive_caps', 'weight' => 10, 'reason' => 'Some uppercase emphasis detected in description.'],
                ],
                'created_at' => $now->copy()->subDays(5),
            ],
        ];

        foreach ($items as $row) {
            $submitter = $users[$row['submitter']];

            Item::query()->updateOrCreate(
                ['title' => $row['title'], 'submitter_id' => $submitter->id],
                [
                    'description' => $row['description'],
                    'status' => $row['status'],
                    'risk' => $row['risk'],
                    'risk_score' => $row['risk_score'],
                    'flags' => $row['flags'],
                    'confidence' => $row['confidence'],
                    'suggested_decision' => $row['suggested_decision'],
                    'created_at' => $row['created_at'],
                    'updated_at' => $row['created_at'],
                ],
            );
        }
    }
}
