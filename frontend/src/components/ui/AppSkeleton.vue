<script setup lang="ts">
withDefaults(
  defineProps<{
    class?: string
  }>(),
  { class: '' },
)
</script>

<template>
  <div class="animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" :class="$props.class" />
</template>
