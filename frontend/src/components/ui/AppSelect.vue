<script setup lang="ts">
import { Check, ChevronDown } from '@lucide/vue'
import AppMenu from '@/components/ui/AppMenu.vue'
import type { FilterOption } from '@/types/api'

const props = defineProps<{
  modelValue: string
  options: FilterOption[]
  placeholder?: string
  label?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function choose(close: () => void, value: string): void {
  emit('update:modelValue', value)
  close()
}

function labelFor(value: string): string {
  if (value === '') {
    return props.placeholder ?? 'Select'
  }
  return props.options.find((option) => option.value === value)?.label ?? props.placeholder ?? 'Select'
}
</script>

<template>
  <div class="space-y-1">
    <p v-if="label" class="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
      {{ label }}
    </p>
    <AppMenu wide align="left">
      <template #trigger>
        <button
          type="button"
          class="flex h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-left text-sm text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        >
          <span class="min-w-0 truncate">{{ labelFor(modelValue) }}</span>
          <ChevronDown class="size-4 shrink-0 text-zinc-400" />
        </button>
      </template>
      <template #default="{ close }">
        <button
          v-for="option in options"
          :key="option.value"
          type="button"
          class="flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800"
          role="option"
          @click="choose(close, option.value)"
        >
          {{ option.label }}
          <Check v-if="option.value === modelValue" class="size-4 text-orange-500" />
        </button>
      </template>
    </AppMenu>
  </div>
</template>
