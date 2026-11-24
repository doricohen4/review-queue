<script setup lang="ts">
import { computed, nextTick, watch } from 'vue'
import { X } from '@lucide/vue'
import ReviewActions from '@/components/ReviewActions.vue'
import StatusChip from '@/components/StatusChip.vue'
import AppSkeleton from '@/components/ui/AppSkeleton.vue'
import { usePersona } from '@/composables/usePersona'
import { useUi } from '@/composables/useUi'
import {
  canEditItem,
  canReviewItem,
  flagLine,
  formatTimestamp,
  hasFlags,
  personName,
} from '@/display/itemDisplay'
import type { Item, Review } from '@/types/api'
import { btnGhost, btnPrimary } from '@/ui/classes'

const props = defineProps<{
  item: Item | null
  itemId: string
  audit: Review[]
  focusReview: boolean
  error: string | null
  reviewError: string | null
  reviewPending: boolean
}>()

const emit = defineEmits<{
  close: []
  review: [payload: { decision: string; note: string | null }]
}>()

const { currentName, canReview: personaCanReview } = usePersona()
const { openEdit } = useUi()

const canReview = computed(
  () => props.item !== null && canReviewItem(props.item, currentName.value),
)
const canEdit = computed(() => props.item !== null && canEditItem(props.item, currentName.value))
const flags = computed(() => props.item?.flags ?? [])
const showFlags = computed(() => hasFlags(flags.value))
const comments = computed(() => props.audit.filter((row) => row.note !== null && row.note !== ''))

watch(
  () => [props.focusReview, props.item?.id],
  async () => {
    if (!props.focusReview) {
      return
    }
    await nextTick()
    document.getElementById('item-review-actions')?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    document.getElementById('item-review-note')?.focus()
  },
)
</script>

<template>
  <div class="fixed inset-0 z-50 flex justify-end">
    <button
      type="button"
      class="absolute inset-0 cursor-pointer bg-zinc-950/40"
      aria-label="Close item panel"
      @click="emit('close')"
    />
    <aside
      class="sheet-panel relative flex h-full w-full max-w-lg flex-col border-l border-zinc-200 bg-white text-zinc-900 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
      aria-label="Item detail"
    >
      <div
        class="flex items-start justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800"
      >
        <div>
          <p class="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Item {{ itemId }}
          </p>
          <h2 v-if="item" class="mt-1 text-lg font-semibold leading-snug">{{ item.title }}</h2>
          <AppSkeleton v-else class="mt-2 h-6 w-48" />
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <button
            v-if="item && canEdit"
            type="button"
            :class="btnPrimary"
            class="h-9"
            @click="openEdit(item)"
          >
            Update
          </button>
          <button type="button" :class="btnGhost" @click="emit('close')">
            <X class="size-4" />
            Close
          </button>
        </div>
      </div>

      <div class="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
        <template v-if="item">
          <div class="flex flex-wrap items-center gap-2">
            <StatusChip :status="item.status" />
            <StatusChip v-if="item.risk" :risk="item.risk" />
            <span class="text-sm text-zinc-500">score {{ item.risk_score }}</span>
          </div>

          <section class="space-y-2">
            <h3 class="text-xs font-semibold uppercase tracking-wide text-zinc-500">Details</h3>
            <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
              <dt class="text-zinc-500">Submitter</dt>
              <dd>{{ personName(item.submitter?.name) }}</dd>
              <dt class="text-zinc-500">Created</dt>
              <dd>{{ formatTimestamp(item.created_at) }}</dd>
              <dt class="text-zinc-500">Updated</dt>
              <dd>{{ formatTimestamp(item.updated_at) }}</dd>
              <dt class="text-zinc-500">Suggested</dt>
              <dd class="capitalize">{{ item.suggested_decision ?? '—' }}</dd>
              <dt class="text-zinc-500">Confidence</dt>
              <dd class="capitalize">{{ item.confidence ?? '—' }}</dd>
            </dl>
          </section>

          <section>
            <h3 class="text-xs font-semibold uppercase tracking-wide text-zinc-500">Content</h3>
            <p class="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              {{ item.description }}
            </p>
          </section>

          <section>
            <h3 class="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Heuristic flags
            </h3>
            <ul v-if="showFlags" class="mt-2 space-y-2">
              <li
                v-for="flag in flags"
                :key="flag.key"
                class="rounded-xl bg-zinc-50 px-3 py-2 text-sm text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
              >
                {{ flagLine(flag) }}
              </li>
            </ul>
            <p v-else class="mt-2 text-sm text-zinc-500">No heuristic flags.</p>
          </section>

          <section>
            <h3 class="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Review comments
            </h3>
            <ul v-if="comments.length > 0" class="mt-2 space-y-3">
              <li
                v-for="row in comments"
                :key="row.id"
                class="rounded-xl border border-orange-200 bg-orange-50 px-3 py-3 text-sm text-zinc-900 shadow-sm dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-zinc-50"
              >
                <p class="text-xs font-medium text-orange-800 dark:text-orange-200">
                  {{ personName(row.reviewer?.name) }}
                  ·
                  {{ row.decision.replaceAll('_', ' ') }}
                  ·
                  {{ formatTimestamp(row.created_at) }}
                </p>
                <p class="mt-2 whitespace-pre-wrap leading-relaxed">{{ row.note }}</p>
              </li>
            </ul>
            <p v-else class="mt-2 text-sm text-zinc-500">No review comments yet.</p>
          </section>
        </template>
        <p v-else-if="error" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
        <div v-else class="space-y-3">
          <AppSkeleton class="h-4 w-full" />
          <AppSkeleton class="h-4 w-5/6" />
          <AppSkeleton class="h-24 w-full" />
        </div>
      </div>

      <div
        v-if="item"
        class="border-t border-zinc-200 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-950"
      >
        <ReviewActions
          v-if="canReview"
          :pending="reviewPending"
          :error="reviewError"
          @review="emit('review', $event)"
        />
        <p v-else-if="canEdit" class="text-sm text-zinc-500">
          <template v-if="item.status === 'needs_work'">
            Sent back for edits. Update the copy and send it back to the queue.
          </template>
          <template v-else>You submitted this. You can still update it before it is reviewed.</template>
        </p>
        <p v-else-if="!personaCanReview" class="text-sm text-zinc-500">
          This persona can submit, but not review. Switch to a reviewer to decide.
        </p>
        <p v-else-if="item.status === 'needs_work'" class="text-sm text-zinc-500">
          Sent back for edits. Review comments are above. It can be reviewed again after the
          submitter resubmits.
        </p>
        <p v-else class="text-sm text-zinc-500">This item is not waiting for a review.</p>
      </div>
    </aside>
  </div>
</template>
