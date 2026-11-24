<script setup lang="ts">
import { computed } from 'vue'
import { ArrowDown, ArrowUp, ChevronsUpDown, ListFilter } from '@lucide/vue'
import AppMenu from '@/components/ui/AppMenu.vue'
import type { SortColumn } from '@/query/queryState'

const props = defineProps<{
  label: string
  sortColumn?: SortColumn
  selectedSort: string
  filterActive?: boolean
  filterLabel?: string
}>()

const emit = defineEmits<{
  sort: []
}>()

const sortState = computed(() => {
  if (props.sortColumn === undefined) {
    return 'none'
  }
  if (props.selectedSort === props.sortColumn) {
    return 'asc'
  }
  if (props.selectedSort === `-${props.sortColumn}`) {
    return 'desc'
  }
  return 'none'
})
</script>

<template>
  <div class="flex items-center gap-1">
    <button
      v-if="sortColumn !== undefined"
      type="button"
      class="inline-flex cursor-pointer items-center gap-1 rounded-md px-1 py-0.5 text-left uppercase hover:bg-zinc-100 dark:hover:bg-zinc-800"
      @click="emit('sort')"
    >
      {{ label }}
      <ArrowUp v-if="sortState === 'asc'" class="size-3.5" />
      <ArrowDown v-else-if="sortState === 'desc'" class="size-3.5" />
      <ChevronsUpDown v-else class="size-3.5 text-zinc-300" />
    </button>
    <span v-else class="px-1">{{ label }}</span>
    <AppMenu v-if="$slots.filter" align="left">
      <template #trigger>
        <button
          type="button"
          class="inline-flex items-center rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          :class="filterActive ? 'bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-200' : ''"
          :aria-label="`Filter ${label}`"
        >
          <ListFilter class="size-3.5" />
          <span
            v-if="filterLabel"
            class="ml-1 max-w-24 truncate rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-orange-800 dark:bg-orange-500/20 dark:text-orange-100"
          >
            {{ filterLabel }}
          </span>
        </button>
      </template>
      <template #default="{ close }">
        <div class="min-w-44 p-1" @pointerdown.stop @click.stop>
          <slot name="filter" :close="close" />
        </div>
      </template>
    </AppMenu>
  </div>
</template>
