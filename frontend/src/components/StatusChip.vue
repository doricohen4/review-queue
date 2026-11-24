<script setup lang="ts">
import { computed } from 'vue'
import {
  CheckCircle2,
  CircleDashed,
  OctagonAlert,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  Undo2,
  XCircle,
} from '@lucide/vue'
import type { ItemStatus, RiskLevel } from '@/types/api'

const props = defineProps<{
  status?: ItemStatus | string
  risk?: RiskLevel | string | null
}>()

const isRisk = computed(() => props.status === undefined && props.risk != null && props.risk !== '')
const value = computed(() => (isRisk.value ? props.risk : props.status) ?? '—')
const display = computed(() => String(value.value).replaceAll('_', ' '))

const statusTone: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-950 dark:bg-amber-500/20 dark:text-amber-100',
  approved: 'bg-emerald-100 text-emerald-950 dark:bg-emerald-500/20 dark:text-emerald-100',
  rejected: 'bg-rose-100 text-rose-950 dark:bg-rose-500/20 dark:text-rose-100',
  needs_work: 'bg-violet-100 text-violet-950 dark:bg-violet-500/20 dark:text-violet-100',
}

const riskTone: Record<string, string> = {
  low: 'border-teal-300 bg-teal-50 text-teal-900 dark:border-teal-500/40 dark:bg-teal-500/10 dark:text-teal-100',
  medium: 'border-yellow-300 bg-yellow-50 text-yellow-950 dark:border-yellow-500/40 dark:bg-yellow-500/10 dark:text-yellow-100',
  high: 'border-orange-400 bg-orange-50 text-orange-950 dark:border-orange-500/50 dark:bg-orange-500/10 dark:text-orange-100',
  critical: 'border-red-500 bg-red-50 text-red-950 dark:border-red-500/60 dark:bg-red-500/15 dark:text-red-100',
}

const statusIcons = {
  pending: CircleDashed,
  approved: CheckCircle2,
  rejected: XCircle,
  needs_work: Undo2,
}

const riskIcons = {
  low: ShieldCheck,
  medium: Shield,
  high: ShieldAlert,
  critical: OctagonAlert,
}

const statusClass = computed(
  () => statusTone[value.value] ?? 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200',
)
const riskClass = computed(
  () => riskTone[value.value] ?? 'border-zinc-300 bg-zinc-50 text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200',
)
const StatusIcon = computed(() => statusIcons[value.value as keyof typeof statusIcons] ?? CircleDashed)
const RiskIcon = computed(() => riskIcons[value.value as keyof typeof riskIcons] ?? TriangleAlert)
</script>

<template>
  <span
    v-if="isRisk"
    class="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
    :class="riskClass"
  >
    <component :is="RiskIcon" class="size-3.5 shrink-0" />
    {{ display }}
  </span>
  <span
    v-else
    class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium capitalize tracking-wide"
    :class="statusClass"
  >
    <component :is="StatusIcon" class="size-3 shrink-0" />
    {{ display }}
  </span>
</template>
