<script setup lang="ts">
import { computed } from 'vue'
import type { FilterOption } from '@/types/api'
import { isAllFiltersSelected, selectedFilterSet, toggleAllFilterValues, toggleFilterValue } from '@/query/queryState'

const props = defineProps<{
  options: FilterOption[]
  selected: string
  allLabel?: string
}>()

const emit = defineEmits<{
  choose: [value: string]
}>()

const allValues = computed(() => props.options.map((option) => option.value))
const checked = computed(() => new Set(selectedFilterSet(props.selected, allValues.value)))
const allOn = computed(() => isAllFiltersSelected(props.selected, allValues.value))

function toggle(value: string): void {
  emit('choose', toggleFilterValue(props.selected, value, allValues.value))
}

function toggleAll(): void {
  emit('choose', toggleAllFilterValues(props.selected, allValues.value))
}
</script>

<template>
  <div class="space-y-0.5">
    <label class="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-zinc-800 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800">
      <input
        type="checkbox"
        class="cursor-pointer accent-orange-500"
        :checked="allOn"
        @change="toggleAll()"
      />
      {{ allLabel ?? 'All' }}
    </label>
    <label
      v-for="option in options"
      :key="option.value"
      class="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-zinc-800 capitalize hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800"
    >
      <input
        type="checkbox"
        class="cursor-pointer accent-orange-500"
        :checked="checked.has(option.value)"
        @change="toggle(option.value)"
      />
      {{ option.label }}
    </label>
  </div>
</template>
