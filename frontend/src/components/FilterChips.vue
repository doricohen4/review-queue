<script setup lang="ts">
import { computed } from 'vue'
import { X } from '@lucide/vue'
import {
  FILTER_EMPTY,
  splitFilterValues,
  summarizeNamedFilters,
  toggleFilterValue,
} from '@/query/queryState'
import {
  STATUS_QUICK_FILTERS,
  isQuickStatusActive,
  nextQuickStatusFilter,
  type QueueFilterView,
} from '@/query/queueFilterView'

const props = defineProps<{
  filters: QueueFilterView
}>()

const emit = defineEmits<{
  filter: [key: string, value: string]
  clear: [partial: Record<string, string>]
}>()

type Chip = { key: string; label: string; clear: (() => void) | null }

function optionChips(
  key: string,
  raw: string,
  options: { value: string; label: string }[],
  prefix: string,
  capNames = false,
): Chip[] {
  if (raw === FILTER_EMPTY) {
    return [
      {
        key: `${key}:none`,
        label: `${prefix}: none`,
        clear: () => emit('filter', key, ''),
      },
    ]
  }
  const allValues = options.map((option) => option.value)
  if (!capNames) {
    return splitFilterValues(raw).map((value) => {
      const option = options.find((row) => row.value === value)
      return {
        key: `${key}:${value}`,
        label: `${prefix}: ${option?.label ?? value}`,
        clear: () => emit('filter', key, toggleFilterValue(raw, value, allValues)),
      }
    })
  }

  const { named, extra } = summarizeNamedFilters(raw, options)
  const chips: Chip[] = named.map((row) => ({
    key: `${key}:${row.value}`,
    label: `${prefix}: ${row.label}`,
    clear: () => emit('filter', key, toggleFilterValue(raw, row.value, allValues)),
  }))
  if (extra > 0) {
    chips.push({
      key: `${key}:more`,
      label: `${prefix}: +${extra}`,
      clear: null,
    })
  }
  return chips
}

const chips = computed((): Chip[] => {
  const next: Chip[] = []
  const statusIsQuick = STATUS_QUICK_FILTERS.some((row) => row.value === props.filters.status)
  if (!statusIsQuick) {
    next.push(...optionChips('status', props.filters.status, props.filters.statusOptions, 'Status'))
  }
  next.push(
    ...optionChips('risk', props.filters.risk, props.filters.riskOptions, 'Risk'),
    ...optionChips('submitter', props.filters.submitter, props.filters.submitterOptions, 'Submitter', true),
  )
  if (props.filters.createdAfter !== '') {
    next.push({
      key: 'created_after',
      label: `From: ${props.filters.createdAfter}`,
      clear: () => emit('filter', 'created_after', ''),
    })
  }
  if (props.filters.createdBefore !== '') {
    next.push({
      key: 'created_before',
      label: `Until: ${props.filters.createdBefore}`,
      clear: () => emit('filter', 'created_before', ''),
    })
  }
  return next
})

function clearAll(): void {
  emit('clear', {
    status: '',
    risk: '',
    submitter: '',
    created_after: '',
    created_before: '',
  })
}

function setQuickStatus(value: string): void {
  emit('filter', 'status', nextQuickStatusFilter(props.filters.status, value))
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-2 px-4 py-2 lg:px-6">
    <button
      v-for="preset in STATUS_QUICK_FILTERS"
      :key="preset.value"
      type="button"
      class="inline-flex cursor-pointer items-center rounded-full px-2.5 py-1 text-xs font-medium"
      :class="
        isQuickStatusActive(filters.status, preset.value)
          ? 'bg-orange-500 text-white'
          : 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800'
      "
      :aria-pressed="isQuickStatusActive(filters.status, preset.value)"
      @click="setQuickStatus(preset.value)"
    >
      {{ preset.label }}
    </button>
    <template v-if="chips.length > 0">
      <span class="hidden h-4 w-px bg-zinc-200 sm:block dark:bg-zinc-700" />
      <button
        v-for="chip in chips"
        :key="chip.key"
        type="button"
        class="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-800 dark:bg-orange-500/15 dark:text-orange-100"
        :class="chip.clear ? 'cursor-pointer' : 'cursor-default'"
        @click="chip.clear?.()"
      >
        {{ chip.label }}
        <X v-if="chip.clear" class="size-3" />
      </button>
      <button type="button" class="cursor-pointer text-xs text-zinc-500 hover:text-zinc-800" @click="clearAll">
        Clear filters
      </button>
    </template>
  </div>
</template>
