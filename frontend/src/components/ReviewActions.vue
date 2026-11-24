<script setup lang="ts">
import { ref } from 'vue'
import { LoaderCircle } from '@lucide/vue'
import { NOTE_MAX } from '@/personas'
import { btnDanger, btnSuccess, btnWarn, fieldFullClass } from '@/ui/classes'

defineProps<{
  pending: boolean
  error: string | null
}>()

const emit = defineEmits<{
  review: [payload: { decision: string; note: string | null }]
}>()

const note = ref('')

function send(decision: string): void {
  emit('review', {
    decision,
    note: decision === 'needs_work' ? note.value : note.value === '' ? null : note.value,
  })
}
</script>

<template>
  <div id="item-review-actions" class="space-y-3">
    <h3 class="text-xs font-semibold uppercase tracking-wide text-zinc-500">Review actions</h3>
    <p v-if="error" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
    <textarea
      v-model="note"
      :maxlength="NOTE_MAX"
      rows="2"
      :class="fieldFullClass"
      placeholder="Leave a comment (required for needs work)"
      id="item-review-note"
      aria-label="Review note"
    />
    <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
      <button type="button" :class="btnSuccess" :disabled="pending" @click="send('approved')">
        <LoaderCircle v-if="pending" class="size-3.5 animate-spin" />
        Approve
      </button>
      <button type="button" :class="btnDanger" :disabled="pending" @click="send('rejected')">
        <LoaderCircle v-if="pending" class="size-3.5 animate-spin" />
        Reject
      </button>
      <button type="button" :class="btnWarn" :disabled="pending" @click="send('needs_work')">
        <LoaderCircle v-if="pending" class="size-3.5 animate-spin" />
        Needs work
      </button>
    </div>
  </div>
</template>
