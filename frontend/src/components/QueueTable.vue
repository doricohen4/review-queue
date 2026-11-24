<script setup lang="ts">
import { computed } from 'vue'
import ColumnHead from '@/components/ColumnHead.vue'
import DateRangePicker from '@/components/DateRangePicker.vue'
import FilterChecks from '@/components/FilterChecks.vue'
import ItemKebab from '@/components/ItemKebab.vue'
import StatusChip from '@/components/StatusChip.vue'
import { useQueue } from '@/composables/useQueue'
import { formatTimestamp, initials, personName, submitterHue } from '@/display/itemDisplay'
import { FILTER_NONE, splitFilterValues } from '@/query/queryState'
import type { Item } from '@/types/api'
defineProps<{
  items: Item[]
}>()

const {
  openId,
  selectedSort,
  selectedStatus,
  selectedRisk,
  selectedSubmitter,
  selectedCreatedAfter,
  selectedCreatedBefore,
  statusOptions,
  riskOptions,
  submitterOptions,
  selectedIds,
  selectedCount,
  pageAllSelected,
  setFilter,
  setFilters,
  toggleColumnSort,
  toggleSelected,
  togglePage,
  openPanel,
} = useQueue()

function joinedLabels(
  raw: string,
  options: { value: string; label: string }[],
): string | undefined {
  if (raw === FILTER_NONE) {
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

const statusLabel = computed(() => joinedLabels(selectedStatus.value, statusOptions.value))
const riskLabel = computed(() => joinedLabels(selectedRisk.value, riskOptions.value))
const submitterLabel = computed(() => joinedLabels(selectedSubmitter.value, submitterOptions.value))
const createdLabel = computed(() => {
  if (selectedCreatedAfter.value !== '' && selectedCreatedBefore.value !== '') {
    return `${selectedCreatedAfter.value}–${selectedCreatedBefore.value}`
  }
  return selectedCreatedAfter.value || selectedCreatedBefore.value || undefined
})

function onFilter(key: string, value: string): void {
  setFilter(key, value)
}

function isSelected(id: number): boolean {
  return selectedIds.value.includes(id)
}
</script>

<template>
  <div class="min-h-0 flex-1 space-y-3 overflow-auto md:hidden">
    <label class="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
      <input
        type="checkbox"
        class="cursor-pointer accent-orange-500"
        :checked="pageAllSelected"
        @change="togglePage()"
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
        @change="toggleSelected(item.id)"
      />
      <button type="button" class="min-w-0 flex-1 cursor-pointer text-left" @click="openPanel(item)">
        <p class="font-medium">{{ item.title }}</p>
        <p class="mt-1 line-clamp-2 text-sm text-zinc-500">{{ item.description }}</p>
        <p v-if="item.latest_comment" class="mt-1 line-clamp-2 text-xs text-orange-800 dark:text-orange-200">
          {{ item.latest_comment.reviewer_name ?? 'Reviewer' }}: {{ item.latest_comment.note }}
        </p>
        <div class="mt-3 flex flex-wrap items-center gap-2">
          <StatusChip :status="item.status" />
          <StatusChip v-if="item.risk" :risk="item.risk" />
          <span class="text-xs text-zinc-500">Created {{ formatTimestamp(item.created_at) }}</span>
        </div>
      </button>
      <div @click.stop>
        <ItemKebab :item="item" />
      </div>
    </div>
  </div>

  <div
    class="hidden min-h-0 flex-1 overflow-auto rounded-xl border border-zinc-200 bg-white md:block dark:border-zinc-800 dark:bg-zinc-900"
  >
    <table class="w-full min-w-[960px] border-separate border-spacing-0 text-left text-sm">
      <thead class="sticky top-0 z-10 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
        <tr>
          <th :class="headCell" class="w-10 px-3">
            <input
              type="checkbox"
              class="cursor-pointer accent-orange-500"
              :checked="pageAllSelected"
              aria-label="Select this page"
              @change="togglePage()"
            />
          </th>
          <th :class="headCell">
            <ColumnHead
              label="Title"
              sort-column="title"
              :selected-sort="selectedSort"
              @sort="toggleColumnSort('title')"
            />
          </th>
          <th :class="headCell">
            <ColumnHead
              label="Submitter"
              :selected-sort="selectedSort"
              :filter-active="selectedSubmitter !== ''"
              :filter-label="submitterLabel"
            >
              <template #filter="{ close }">
                <FilterChecks
                  :options="submitterOptions"
                  :selected="selectedSubmitter"
                  @choose="onFilter('submitter', $event)"
                />
              </template>
            </ColumnHead>
          </th>
          <th :class="headCell">
            <ColumnHead
              label="Status"
              :selected-sort="selectedSort"
              :filter-active="selectedStatus !== ''"
              :filter-label="statusLabel"
            >
              <template #filter="{ close }">
                <FilterChecks
                  :options="statusOptions"
                  :selected="selectedStatus"
                  @choose="onFilter('status', $event)"
                />
              </template>
            </ColumnHead>
          </th>
          <th :class="headCell">
            <ColumnHead
              label="Risk"
              sort-column="risk_score"
              :selected-sort="selectedSort"
              :filter-active="selectedRisk !== ''"
              :filter-label="riskLabel"
              @sort="toggleColumnSort('risk_score')"
            >
              <template #filter="{ close }">
                <FilterChecks
                  :options="riskOptions"
                  :selected="selectedRisk"
                  @choose="onFilter('risk', $event)"
                />
              </template>
            </ColumnHead>
          </th>
          <th :class="headCell">
            <ColumnHead
              label="Created"
              sort-column="created_at"
              :selected-sort="selectedSort"
              :filter-active="selectedCreatedAfter !== '' || selectedCreatedBefore !== ''"
              :filter-label="createdLabel"
              @sort="toggleColumnSort('created_at')"
            >
              <template #filter>
                <DateRangePicker
                  :after="selectedCreatedAfter"
                  :before="selectedCreatedBefore"
                  @update="setFilters({ created_after: $event.after, created_before: $event.before })"
                />
              </template>
            </ColumnHead>
          </th>
          <th :class="headCell">
            <ColumnHead
              label="Updated"
              sort-column="updated_at"
              :selected-sort="selectedSort"
              @sort="toggleColumnSort('updated_at')"
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
          @click="openPanel(item)"
          @keydown.enter.prevent="openPanel(item)"
        >
          <td class="px-3 py-3" @click.stop>
            <input
              type="checkbox"
              class="cursor-pointer accent-orange-500"
              :checked="isSelected(item.id)"
              :aria-label="`Select ${item.title}`"
              @change="toggleSelected(item.id)"
            />
          </td>
          <td class="max-w-sm px-4 py-3">
            <div class="flex items-start gap-2">
              <div class="min-w-0 flex-1">
                <p class="font-medium text-zinc-900 dark:text-zinc-100">{{ item.title }}</p>
                <p class="mt-0.5 line-clamp-1 text-xs text-zinc-500">{{ item.description }}</p>
                <p
                  v-if="item.latest_comment"
                  class="mt-1 line-clamp-2 text-xs text-orange-800 dark:text-orange-200"
                >
                  {{ item.latest_comment.reviewer_name ?? 'Reviewer' }}:
                  {{ item.latest_comment.note }}
                </p>
              </div>
              <div class="shrink-0" @click.stop>
                <ItemKebab :item="item" />
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
            <div class="flex items-center gap-2">
              <span class="w-6 tabular-nums text-zinc-500">{{ item.risk_score }}</span>
              <StatusChip v-if="item.risk" :risk="item.risk" />
              <span v-else class="text-zinc-400">—</span>
            </div>
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
