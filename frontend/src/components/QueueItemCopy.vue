<script setup lang="ts">
import type { Item } from '@/types/api'

withDefaults(
  defineProps<{
    item: Item
    dense?: boolean
  }>(),
  { dense: false },
)
</script>

<template>
  <p class="font-medium text-zinc-900 dark:text-zinc-100">{{ item.title }}</p>
  <p
    class="text-zinc-500"
    :class="dense ? 'mt-0.5 line-clamp-1 text-xs' : 'mt-1 line-clamp-2 text-sm'"
  >
    {{ item.description }}
  </p>
  <p
    v-if="item.latest_comment"
    class="mt-1 line-clamp-2 text-xs text-orange-800 dark:text-orange-200"
  >
    {{ item.latest_comment.reviewer_name ?? 'Reviewer' }}:
    {{ item.latest_comment.note }}
  </p>
</template>
