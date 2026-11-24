<script setup lang="ts">
import { computed } from 'vue'
import type { ItemStatus, RiskLevel } from '@/types/api'

const props = defineProps<{
  status?: ItemStatus | string
  risk?: RiskLevel | string | null
}>()

const isRisk = computed(() => props.status === undefined && props.risk != null && props.risk !== '')
const value = computed(() => (isRisk.value ? props.risk : props.status) ?? '—')
const display = computed(() => String(value.value).replaceAll('_', ' '))

const statusTone: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-100',
  approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-100',
  rejected: 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-100',
  needs_work: 'bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-100',
}

const riskTone: Record<string, string> = {
  low: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-100',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-100',
  high: 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-100',
  critical: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-100',
}

const chipClass = computed(
  () =>
    (isRisk.value ? riskTone[value.value] : statusTone[value.value]) ??
    'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200',
)
</script>

<template>
  <span
    class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize tracking-wide"
    :class="chipClass"
  >
    {{ display }}
  </span>
</template>
