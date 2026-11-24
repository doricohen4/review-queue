<script setup lang="ts">
import { computed } from 'vue'
import { MoreHorizontal } from '@lucide/vue'
import AppMenu from '@/components/ui/AppMenu.vue'
import { usePersona } from '@/composables/usePersona'
import { useQueue } from '@/composables/useQueue'
import { useUi } from '@/composables/useUi'
import { canEditItem, canReviewItem } from '@/display/itemDisplay'
import type { Item } from '@/types/api'

const props = defineProps<{
  item: Item
}>()

const { currentName } = usePersona()
const { openPanel, reviewIds } = useQueue()
const { openEdit } = useUi()

const canReview = computed(() => canReviewItem(props.item, currentName.value))
const canEdit = computed(() => canEditItem(props.item, currentName.value))

const quick = computed(() => {
  if (!canReview.value) {
    return null
  }
  if (props.item.risk === 'low' || props.item.suggested_decision === 'approve') {
    return { label: 'Quick approve', decision: 'approved' }
  }
  if (props.item.risk === 'critical' || props.item.suggested_decision === 'reject') {
    return { label: 'Quick reject', decision: 'rejected' }
  }
  return null
})

function runQuick(decision: string, close: () => void): void {
  void reviewIds([props.item.id], { decision, note: null })
  close()
}
</script>

<template>
  <AppMenu align="right" side="left">
    <template #trigger>
      <button
        type="button"
        class="cursor-pointer rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
        aria-label="Item actions"
      >
        <MoreHorizontal class="size-4" />
      </button>
    </template>
    <template #default="{ close }">
      <p class="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
        Quick actions
      </p>
      <button
        type="button"
        class="block w-full rounded-lg px-2.5 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
        @click="openPanel(item); close()"
      >
        Open details
      </button>
      <button
        v-if="canEdit"
        type="button"
        class="block w-full rounded-lg px-2.5 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
        @click="openEdit(item); close()"
      >
        Update…
      </button>
      <button
        v-if="canReview"
        type="button"
        class="block w-full rounded-lg px-2.5 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
        @click="openPanel(item, { review: true }); close()"
      >
        Review…
      </button>
      <button
        v-if="quick !== null"
        type="button"
        class="block w-full rounded-lg px-2.5 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
        @click="runQuick(quick.decision, close)"
      >
        {{ quick.label }}
      </button>
    </template>
  </AppMenu>
</template>
