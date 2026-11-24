<script setup lang="ts">
import { computed } from 'vue'
import { flagLine, hasFlags, riskLabel } from '@/display/itemDisplay'
import type { Item } from '@/types/api'

const props = defineProps<{
  item: Item | null
  itemId: string
}>()

const emit = defineEmits<{
  close: []
}>()

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
    </template>
    <p v-else>Item {{ itemId }} is not on this page.</p>
  </aside>
</template>

<style scoped>
aside {
  border: 1px solid #ddd;
  padding: 1rem;
}
</style>
