<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import {
  calendarCells,
  inRange,
  isoDay,
  monthLabel,
  pickRangeDay,
  shiftMonth,
} from '@/display/dateRange'

const props = defineProps<{
  after: string
  before: string
}>()

const emit = defineEmits<{
  update: [range: { after: string; before: string }]
}>()

const today = new Date()
const cursor = ref({ year: today.getFullYear(), month: today.getMonth() })

const cells = computed(() => calendarCells(cursor.value.year, cursor.value.month))
const heading = computed(() => monthLabel(cursor.value.year, cursor.value.month))
const range = computed(() => ({ after: props.after, before: props.before }))

function move(delta: number): void {
  cursor.value = shiftMonth(cursor.value.year, cursor.value.month, delta)
}

function choose(iso: string): void {
  emit('update', pickRangeDay(range.value, iso))
}

function preset(days: number): void {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - (days - 1))
  emit('update', { after: isoDay(start), before: isoDay(end) })
}

function todayRange(): void {
  const day = isoDay(new Date())
  emit('update', { after: day, before: day })
}

function cellClass(iso: string, inMonth: boolean): string {
  const selected = iso === props.after || iso === props.before
  const between = inRange(iso, range.value) && props.after !== '' && props.before !== ''
  return [
    'h-8 w-8 cursor-pointer rounded-lg text-xs tabular-nums',
    inMonth ? 'text-zinc-800 dark:text-zinc-100' : 'text-zinc-300 dark:text-zinc-600',
    selected ? 'bg-orange-500 font-semibold text-white dark:text-white' : '',
    !selected && between ? 'bg-orange-100 dark:bg-orange-500/20' : '',
    !selected && !between ? 'hover:bg-zinc-100 dark:hover:bg-zinc-800' : '',
  ].join(' ')
}
</script>

<template>
  <div class="w-64 space-y-2 p-1 text-zinc-800 dark:text-zinc-100">
    <p class="px-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Range</p>
    <div class="flex flex-wrap gap-1">
      <button type="button" class="cursor-pointer rounded-full bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-800" @click="todayRange()">
        Today
      </button>
      <button type="button" class="cursor-pointer rounded-full bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-800" @click="preset(7)">
        Last 7 days
      </button>
      <button type="button" class="cursor-pointer rounded-full bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-800" @click="preset(30)">
        Last 30 days
      </button>
    </div>
    <div class="flex items-center justify-between px-1">
      <button type="button" class="cursor-pointer rounded-md p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Previous month" @click="move(-1)">
        <ChevronLeft class="size-4" />
      </button>
      <p class="text-sm font-medium">{{ heading }}</p>
      <button type="button" class="cursor-pointer rounded-md p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Next month" @click="move(1)">
        <ChevronRight class="size-4" />
      </button>
    </div>
    <div class="grid grid-cols-7 gap-0.5 px-1 text-center text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
      <span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span><span>Su</span>
    </div>
    <div class="grid grid-cols-7 gap-0.5 px-1">
      <button
        v-for="cell in cells"
        :key="cell.iso"
        type="button"
        :class="cellClass(cell.iso, cell.inMonth)"
        @click="choose(cell.iso)"
      >
        {{ cell.day }}
      </button>
    </div>
    <p class="px-1 text-xs text-zinc-500">
      <template v-if="after && before">{{ after }} → {{ before }}</template>
      <template v-else-if="after">From {{ after }} — pick an end date</template>
      <template v-else>Click a start date, then an end date.</template>
    </p>
    <button
      type="button"
      class="w-full cursor-pointer rounded-lg px-2 py-1.5 text-left text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
      @click="emit('update', { after: '', before: '' })"
    >
      Clear dates
    </button>
  </div>
</template>
