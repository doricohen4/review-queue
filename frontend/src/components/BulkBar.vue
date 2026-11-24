<script setup lang="ts">
import { ref } from 'vue'
import { LoaderCircle } from '@lucide/vue'
import { usePersona } from '@/composables/usePersona'
import { btnDanger, btnGhost, btnSuccess, btnWarn, fieldClass } from '@/ui/classes'

defineProps<{
  count: number
  pending: boolean
}>()

const emit = defineEmits<{
  review: [decision: string, note: string]
  clear: []
}>()

const { canReview } = usePersona()
const note = ref('')
</script>

<template>
  <div
    v-if="count > 0 && canReview"
    class="flex flex-wrap items-center gap-2 border-t border-orange-200 bg-orange-50 px-4 py-2 dark:border-orange-500/30 dark:bg-orange-500/10 lg:px-6"
  >
    <p class="text-sm font-medium text-orange-900 dark:text-orange-100">
      {{ count }} selected
      <span class="font-normal text-orange-800/80 dark:text-orange-200/80">across pages</span>
    </p>
    <input
      v-model="note"
      type="text"
      :class="fieldClass"
      class="h-9 w-44"
      placeholder="Note (needs work)"
      aria-label="Bulk review note"
    />
    <button type="button" :class="btnSuccess" :disabled="pending" @click="emit('review', 'approved', note)">
      <LoaderCircle v-if="pending" class="size-3.5 animate-spin" />
      Approve
    </button>
    <button type="button" :class="btnDanger" :disabled="pending" @click="emit('review', 'rejected', note)">
      <LoaderCircle v-if="pending" class="size-3.5 animate-spin" />
      Reject
    </button>
    <button type="button" :class="btnWarn" :disabled="pending" @click="emit('review', 'needs_work', note)">
      <LoaderCircle v-if="pending" class="size-3.5 animate-spin" />
      Needs work
    </button>
    <button type="button" :class="btnGhost" @click="emit('clear')">Clear</button>
  </div>
</template>
