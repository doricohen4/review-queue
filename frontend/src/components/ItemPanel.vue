<script setup lang="ts" generic="TItem extends Item">
import { computed } from 'vue'
import ReviewActions from '@/components/ReviewActions.vue'
import { flagLine, hasFlags, riskLabel } from '@/display/itemDisplay'
import type { Item } from '@/types/api'

const props = defineProps<{
  item: TItem | null
  itemId: string
  error: string | null
  reviewError: string | null
  reviewPending: boolean
}>()

const emit = defineEmits<{
  close: []
  review: [payload: { decision: string; note: string | null }]
}>()

const canReview = computed(() => props.item?.status === 'pending')

/** Status · risk · score — kept out of the template so the markup stays names only. */
const summary = computed(() => {
  if (props.item === null) {
    return ''
  }
  return `${props.item.status} · ${riskLabel(props.item.risk, 'no risk')} · score ${props.item.risk_score}`
})

const flags = computed(() => props.item?.flags ?? [])
const showFlags = computed(() => hasFlags(flags.value))
</script>

<template>
  <aside aria-label="Item detail">
    <button type="button" @click="emit('close')">Close</button>
    <template v-if="item">
      <h2>{{ item.title }}</h2>
      <p>{{ summary }}</p>
      <p>{{ item.description }}</p>
      <ul v-if="showFlags">
        <li v-for="flag in flags" :key="flag.key">{{ flagLine(flag) }}</li>
      </ul>
      <p v-else>No heuristic flags.</p>
      <ReviewActions
        v-if="canReview"
        :pending="reviewPending"
        :error="reviewError"
        @review="emit('review', $event)"
      />
    </template>
    <p v-else-if="error">{{ error }}</p>
    <p v-else>Loading item {{ itemId }}…</p>
  </aside>
</template>

<style scoped>
aside {
  border: 1px solid #ddd;
  padding: 1rem;
}
</style>
