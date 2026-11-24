<script setup lang="ts">
import { ref, watch } from 'vue'
import { LoaderCircle } from '@lucide/vue'
import { NOTE_MAX } from '@/contentLimits'
import { usePersona } from '@/composables/usePersona'
import {
  clearReviewDraft,
  readReviewDraft,
  writeReviewDraft,
} from '@/review/reviewDrafts'
import { canSendReview, needsWorkNoteError, reviewNotePayload } from '@/review/reviewForm'
import { btnDanger, btnSuccess, btnWarn, fieldFullClass } from '@/ui/classes'

const props = defineProps<{
  itemId: string
  pending: boolean
  error: string | null
}>()

const emit = defineEmits<{
  review: [payload: { decision: string; note: string | null }]
}>()

const { currentName } = usePersona()
const note = ref('')
const noteError = ref<string | null>(null)
const pendingDecision = ref<string | null>(null)

watch(
  () => [props.itemId, currentName.value] as const,
  ([itemId, persona]) => {
    note.value = readReviewDraft(itemId, persona)
    noteError.value = null
    pendingDecision.value = null
  },
  { immediate: true },
)

watch(note, (value) => {
  writeReviewDraft(props.itemId, currentName.value, value)
})

watch(
  () => props.pending,
  (pending, wasPending) => {
    if (wasPending === true && !pending) {
      pendingDecision.value = null
      if (props.error === null) {
        note.value = ''
        clearReviewDraft(props.itemId, currentName.value)
      }
    }
  },
)

function send(decision: string): void {
  if (!canSendReview(decision, note.value)) {
    noteError.value = needsWorkNoteError(note.value)
    document.getElementById('item-review-note')?.focus()
    return
  }
  noteError.value = null
  pendingDecision.value = decision
  emit('review', {
    decision,
    note: reviewNotePayload(decision, note.value),
  })
}

function showSpinner(decision: string): boolean {
  return props.pending && pendingDecision.value === decision
}
</script>

<template>
  <div id="item-review-actions" class="space-y-3">
    <h3 class="text-xs font-semibold uppercase tracking-wide text-zinc-500">Review actions</h3>
    <p v-if="error" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
    <div class="space-y-1.5">
      <div class="flex items-center justify-between gap-2">
        <label for="item-review-note" class="text-sm font-medium">Review note</label>
        <span class="text-xs font-normal text-zinc-400">{{ note.length }}/{{ NOTE_MAX }}</span>
      </div>
      <p id="item-review-note-help" class="text-xs text-zinc-500">
        Required for “Needs work”; optional otherwise.
      </p>
      <textarea
        id="item-review-note"
        v-model="note"
        :maxlength="NOTE_MAX"
        rows="2"
        :class="fieldFullClass"
        :aria-invalid="noteError !== null"
        :aria-describedby="
          noteError ? 'item-review-note-help item-review-note-error' : 'item-review-note-help'
        "
        @input="noteError = null"
      />
      <p
        v-if="noteError"
        id="item-review-note-error"
        class="text-sm text-red-600 dark:text-red-400"
      >
        {{ noteError }}
      </p>
    </div>
    <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
      <button
        type="button"
        :class="btnSuccess"
        :disabled="pending"
        :aria-busy="showSpinner('approved')"
        @click="send('approved')"
      >
        <LoaderCircle v-if="showSpinner('approved')" class="size-3.5 animate-spin" />
        Approve
      </button>
      <button
        type="button"
        :class="btnDanger"
        :disabled="pending"
        :aria-busy="showSpinner('rejected')"
        @click="send('rejected')"
      >
        <LoaderCircle v-if="showSpinner('rejected')" class="size-3.5 animate-spin" />
        Reject
      </button>
      <button
        type="button"
        :class="btnWarn"
        :disabled="pending"
        :aria-busy="showSpinner('needs_work')"
        @click="send('needs_work')"
      >
        <LoaderCircle v-if="showSpinner('needs_work')" class="size-3.5 animate-spin" />
        Needs work
      </button>
    </div>
  </div>
</template>
