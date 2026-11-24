<script setup lang="ts">
import { ref } from 'vue'
import { NOTE_MAX } from '@/personas'

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
    note: decision === 'needs_work' ? note.value : null,
  })
}
</script>

<template>
  <div>
    <p v-if="error">{{ error }}</p>
    <textarea
      v-model="note"
      :maxlength="NOTE_MAX"
      rows="2"
      placeholder="Note (required for needs work)"
      aria-label="Review note"
    />
    <button type="button" :disabled="pending" @click="send('approved')">Approve</button>
    <button type="button" :disabled="pending" @click="send('rejected')">Reject</button>
    <button type="button" :disabled="pending" @click="send('needs_work')">Needs work</button>
  </div>
</template>
