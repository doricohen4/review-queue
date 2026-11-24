<script setup lang="ts">
import { computed } from 'vue'
import { X } from '@lucide/vue'
import { useQueue } from '@/composables/useQueue'
import { FILTER_NONE, splitFilterValues, toggleFilterValue } from '@/query/queryState'

const {
  selectedStatus,
  selectedRisk,
  selectedSubmitter,
  selectedCreatedAfter,
  selectedCreatedBefore,
  statusOptions,
  riskOptions,
  submitterOptions,
  setFilter,
  setFilters,
} = useQueue()

type Chip = { key: string; label: string; clear: () => void }

function optionChips(
  key: string,
  raw: string,
  options: { value: string; label: string }[],
  prefix: string,
): Chip[] {
  if (raw === FILTER_NONE) {
    return [
      {
        key: `${key}:none`,
        label: `${prefix}: none`,
        clear: () => setFilter(key, ''),
      },
    ]
  }
  const allValues = options.map((option) => option.value)
  return splitFilterValues(raw).map((value) => {
    const option = options.find((row) => row.value === value)
    return {
      key: `${key}:${value}`,
      label: `${prefix}: ${option?.label ?? value}`,
      clear: () => setFilter(key, toggleFilterValue(raw, value, allValues)),
    }
  })
}

const chips = computed((): Chip[] => {
  const next: Chip[] = [
    ...optionChips('status', selectedStatus.value, statusOptions.value, 'Status'),
    ...optionChips('risk', selectedRisk.value, riskOptions.value, 'Risk'),
    ...optionChips('submitter', selectedSubmitter.value, submitterOptions.value, 'Submitter'),
  ]
  if (selectedCreatedAfter.value !== '') {
    next.push({
      key: 'created_after',
      label: `From: ${selectedCreatedAfter.value}`,
      clear: () => setFilter('created_after', ''),
    })
  }
  if (selectedCreatedBefore.value !== '') {
    next.push({
      key: 'created_before',
      label: `Until: ${selectedCreatedBefore.value}`,
      clear: () => setFilter('created_before', ''),
    })
  }
  return next
})

function clearAll(): void {
  setFilters({
    status: '',
    risk: '',
    submitter: '',
    created_after: '',
    created_before: '',
  })
}
</script>

<template>
  <div v-if="chips.length > 0" class="flex flex-wrap items-center gap-2 px-4 py-2 lg:px-6">
    <button
      v-for="chip in chips"
      :key="chip.key"
      type="button"
      class="inline-flex cursor-pointer items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-800 dark:bg-orange-500/15 dark:text-orange-100"
      @click="chip.clear()"
    >
      {{ chip.label }}
      <X class="size-3" />
    </button>
    <button type="button" class="cursor-pointer text-xs text-zinc-500 hover:text-zinc-800" @click="clearAll">
      Clear filters
    </button>
  </div>
</template>
