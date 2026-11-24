<script setup lang="ts">
import { computed } from 'vue'
import ColumnHead from '@/components/ColumnHead.vue'
import DateRangePicker from '@/components/DateRangePicker.vue'
import FilterChecks from '@/components/FilterChecks.vue'
import ItemKebab from '@/components/ItemKebab.vue'
import QueueItemCopy from '@/components/QueueItemCopy.vue'
import StatusChip from '@/components/StatusChip.vue'
import { formatTimestamp, initials, personName, submitterHue } from '@/display/itemDisplay'
import type { QueueFilterView } from '@/query/queueFilterView'
import { FILTER_EMPTY, splitFilterValues, type SortColumn } from '@/query/queryState'
import type { Item } from '@/types/api'

const props = defineProps<{
  items: Item[]
  openId: string | null
  selectedSort: string
  filters: QueueFilterView
  selectedIds: number[]
  selectedCount: number
  pageAllSelected: boolean
}>()

const emit = defineEmits<{
  filter: [key: string, value: string]
  filters: [partial: Record<string, string>]
  sort: [column: SortColumn]
  toggleSelected: [id: number]
  togglePage: []
  open: [item: Item, options?: { review?: boolean }]
  quick: [item: Item, decision: string]
}>()

function joinedLabels(
  raw: string,
  options: { value: string; label: string }[],
): string | undefined {
  if (raw === FILTER_EMPTY) {
    return 'None'
  }
  const values = splitFilterValues(raw)
  if (values.length === 0) {
    return undefined
  }
  const labels = values.map(
    (value) => options.find((option) => option.value === value)?.label ?? value,
  )
  if (labels.length === 1) {
    return labels[0]
  }
  return `${labels.length} selected`
}

const headCell =
  'sticky top-0 z-10 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900'

const statusLabel = computed(() => joinedLabels(props.filters.status, props.filters.statusOptions))
const riskLabel = computed(() => joinedLabels(props.filters.risk, props.filters.riskOptions))
const submitterLabel = computed(() =>
  joinedLabels(props.filters.submitter, props.filters.submitterOptions),
)
const createdLabel = computed(() => {
  if (props.filters.createdAfter !== '' && props.filters.createdBefore !== '') {
    return `${props.filters.createdAfter}–${props.filters.createdBefore}`
  }
  return props.filters.createdAfter || props.filters.createdBefore || undefined
})

function isSelected(id: number): boolean {
  return props.selectedIds.includes(id)
}
</script>

<template>
  <div class="min-h-0 flex-1 space-y-3 overflow-auto xl:hidden">
    <label class="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
      <input
        type="checkbox"
        class="cursor-pointer accent-orange-500"
        :checked="pageAllSelected"
        @change="emit('togglePage')"
      />
      Select this page
      <span v-if="selectedCount > 0" class="text-orange-700 dark:text-orange-300">
        · {{ selectedCount }} kept
      </span>
    </label>
    <p
      v-if="items.length === 0"
      class="flex min-h-64 items-center justify-center rounded-2xl border border-dashed border-zinc-300 px-4 text-center text-sm text-zinc-500 dark:border-zinc-700"
    >
      No results were found.
    </p>
    <div
      v-for="item in items"
      :key="item.id"
      class="flex gap-2 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      :class="String(item.id) === openId ? 'ring-2 ring-orange-400' : ''"
    >
      <input
        type="checkbox"
        class="mt-1 cursor-pointer accent-orange-500"
        :checked="isSelected(item.id)"
        :aria-label="`Select ${item.title}`"
        @click.stop
        @change="emit('toggleSelected', item.id)"
      />
      <button type="button" class="min-w-0 flex-1 cursor-pointer text-left" @click="emit('open', item)">
        <QueueItemCopy :item="item" />
        <div class="mt-3 flex flex-wrap items-center gap-2">
          <StatusChip :status="item.status" />
          <StatusChip v-if="item.risk" :risk="item.risk" />
          <span class="text-xs text-zinc-500">Created {{ formatTimestamp(item.created_at) }}</span>
        </div>
      </button>
      <div @click.stop>
        <ItemKebab :item="item" @open="(row, options) => emit('open', row, options)" @quick="(row, decision) => emit('quick', row, decision)" />
      </div>
    </div>
  </div>

  <div
    class="hidden min-h-0 flex-1 overflow-auto rounded-xl border border-zinc-200 bg-white xl:block dark:border-zinc-800 dark:bg-zinc-900"
  >
    <table
      class="w-full min-w-[1100px] table-fixed border-separate border-spacing-0 text-left text-sm"
    >
      <colgroup>
        <col class="w-10" />
        <col />
        <col class="w-44" />
        <col class="w-36" />
        <col class="w-32" />
        <col class="w-32" />
        <col class="w-32" />
      </colgroup>
      <thead class="sticky top-0 z-10 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
        <tr>
          <th :class="headCell" class="w-10 px-3">
            <input
              type="checkbox"
              class="cursor-pointer accent-orange-500"
              :checked="pageAllSelected"
              aria-label="Select this page"
              @change="emit('togglePage')"
            />
          </th>
          <th :class="headCell">
            <ColumnHead
              label="Title"
              sort-column="title"
              :selected-sort="selectedSort"
              @sort="emit('sort', 'title')"
            />
          </th>
          <th :class="headCell">
            <ColumnHead
              label="Submitter"
              :selected-sort="selectedSort"
              :filter-active="filters.submitter !== ''"
              :filter-label="submitterLabel"
            >
              <template #filter>
                <FilterChecks
                  :options="filters.submitterOptions"
                  :selected="filters.submitter"
                  @choose="emit('filter', 'submitter', $event)"
                />
              </template>
            </ColumnHead>
          </th>
          <th :class="headCell">
            <ColumnHead
              label="Status"
              :selected-sort="selectedSort"
              :filter-active="filters.status !== ''"
              :filter-label="statusLabel"
            >
              <template #filter>
                <FilterChecks
                  :options="filters.statusOptions"
                  :selected="filters.status"
                  @choose="emit('filter', 'status', $event)"
                />
              </template>
            </ColumnHead>
          </th>
          <th :class="headCell">
            <ColumnHead
              label="Risk"
              sort-column="risk_score"
              :selected-sort="selectedSort"
              :filter-active="filters.risk !== ''"
              :filter-label="riskLabel"
              @sort="emit('sort', 'risk_score')"
            >
              <template #filter>
                <FilterChecks
                  :options="filters.riskOptions"
                  :selected="filters.risk"
                  @choose="emit('filter', 'risk', $event)"
                />
              </template>
            </ColumnHead>
          </th>
          <th :class="headCell">
            <ColumnHead
              label="Created"
              sort-column="created_at"
              :selected-sort="selectedSort"
              :filter-active="filters.createdAfter !== '' || filters.createdBefore !== ''"
              :filter-label="createdLabel"
              @sort="emit('sort', 'created_at')"
            >
              <template #filter>
                <DateRangePicker
                  :after="filters.createdAfter"
                  :before="filters.createdBefore"
                  @update="emit('filters', { created_after: $event.after, created_before: $event.before })"
                />
              </template>
            </ColumnHead>
          </th>
          <th :class="headCell">
            <ColumnHead
              label="Updated"
              sort-column="updated_at"
              :selected-sort="selectedSort"
              @sort="emit('sort', 'updated_at')"
            />
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="items.length === 0">
          <td colspan="7" class="h-[28rem] px-4 text-center align-middle text-sm text-zinc-500">
            No results were found.
          </td>
        </tr>
        <tr
          v-for="item in items"
          :key="item.id"
          class="cursor-pointer border-b border-zinc-100 last:border-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/60"
          :class="String(item.id) === openId ? 'bg-orange-50 dark:bg-orange-500/10' : ''"
          tabindex="0"
          @click="emit('open', item)"
          @keydown.enter.prevent="emit('open', item)"
        >
          <td class="px-3 py-3" @click.stop>
            <input
              type="checkbox"
              class="cursor-pointer accent-orange-500"
              :checked="isSelected(item.id)"
              :aria-label="`Select ${item.title}`"
              @change="emit('toggleSelected', item.id)"
            />
          </td>
          <td class="overflow-hidden px-4 py-3">
            <div class="flex items-start gap-2">
              <div class="min-w-0 flex-1">
                <QueueItemCopy :item="item" dense />
              </div>
              <div class="shrink-0" @click.stop>
                <ItemKebab :item="item" @open="(row, options) => emit('open', row, options)" @quick="(row, decision) => emit('quick', row, decision)" />
              </div>
            </div>
          </td>
          <td class="px-4 py-3">
            <div class="flex items-center gap-2">
              <span
                class="submitter-mark flex size-7 items-center justify-center rounded-full text-[10px] font-semibold"
                :style="{ '--mark': String(submitterHue(item.submitter?.name)) }"
              >
                {{ initials(item.submitter?.name) }}
              </span>
              <span class="text-zinc-700 dark:text-zinc-300">{{
                personName(item.submitter?.name)
              }}</span>
            </div>
          </td>
          <td class="px-4 py-3"><StatusChip :status="item.status" /></td>
          <td class="px-4 py-3">
            <StatusChip v-if="item.risk" :risk="item.risk" />
            <span v-else class="text-zinc-400">—</span>
          </td>
          <td class="px-4 py-3 whitespace-nowrap text-zinc-500">
            {{ formatTimestamp(item.created_at) }}
          </td>
          <td class="px-4 py-3 whitespace-nowrap text-zinc-500">
            {{ formatTimestamp(item.updated_at) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.submitter-mark {
  background: hsl(var(--mark) 70% 90%);
  color: hsl(var(--mark) 42% 22%);
}

:global(.dark) .submitter-mark {
  background: hsl(var(--mark) 38% 26%);
  color: hsl(var(--mark) 72% 92%);
}
</style>
