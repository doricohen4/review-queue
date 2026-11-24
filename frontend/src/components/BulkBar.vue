<script setup lang="ts">
import { usePersona } from '@/composables/usePersona'
import { useQueue } from '@/composables/useQueue'
import { btnDanger, btnGhost, btnSuccess, btnWarn, fieldClass } from '@/ui/classes'

const { canReview } = usePersona()
const { selectedCount, bulkNote, reviewPending, reviewSelected, clearSelection } = useQueue()
</script>

<template>
  <div
    v-if="selectedCount > 0 && canReview"
    class="flex flex-wrap items-center gap-2 border-t border-orange-200 bg-orange-50 px-4 py-2 dark:border-orange-500/30 dark:bg-orange-500/10 lg:px-6"
  >
    <p class="text-sm font-medium text-orange-900 dark:text-orange-100">
      {{ selectedCount }} selected
      <span class="font-normal text-orange-800/80 dark:text-orange-200/80">across pages</span>
    </p>
    <input
      v-model="bulkNote"
      type="text"
      :class="fieldClass"
      class="h-9 w-44"
      placeholder="Note (needs work)"
      aria-label="Bulk review note"
    />
    <button type="button" :class="btnSuccess" :disabled="reviewPending" @click="reviewSelected('approved')">
      Approve
    </button>
    <button type="button" :class="btnDanger" :disabled="reviewPending" @click="reviewSelected('rejected')">
      Reject
    </button>
    <button type="button" :class="btnWarn" :disabled="reviewPending" @click="reviewSelected('needs_work')">
      Needs work
    </button>
    <button type="button" :class="btnGhost" @click="clearSelection()">Clear</button>
  </div>
</template>
