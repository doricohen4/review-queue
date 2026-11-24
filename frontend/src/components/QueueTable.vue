<script setup lang="ts">
import { personName, riskLabel } from '@/display/itemDisplay'
import type { Item } from '@/types/api'

defineProps<{
  items: Item[]
  openId: string | null
}>()

const emit = defineEmits<{
  open: [item: Item]
}>()
</script>

<template>
  <table>
    <thead>
      <tr>
        <th>Title</th>
        <th>Status</th>
        <th>Risk</th>
        <th>Score</th>
        <th>Submitter</th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="item in items"
        :key="item.id"
        :aria-current="String(item.id) === openId ? 'true' : undefined"
      >
        <td>
          <button type="button" @click="emit('open', item)">{{ item.title }}</button>
        </td>
        <td>{{ item.status }}</td>
        <td>{{ riskLabel(item.risk) }}</td>
        <td>{{ item.risk_score }}</td>
        <td>{{ personName(item.submitter?.name) }}</td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
table {
  width: 100%;
  border-collapse: collapse;
}
th,
td {
  text-align: left;
  padding: 0.4rem;
  border-bottom: 1px solid #ddd;
}
</style>
