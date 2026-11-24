<script setup lang="ts">
import AppSkeleton from '@/components/ui/AppSkeleton.vue'
</script>

<template>
  <div class="space-y-3 xl:hidden">
    <div
      v-for="row in 6"
      :key="row"
      class="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <AppSkeleton class="h-4 w-2/3" />
      <AppSkeleton class="mt-2 h-3 w-full" />
      <AppSkeleton class="mt-3 h-5 w-24 rounded-full" />
    </div>
  </div>
  <div
    class="hidden overflow-hidden rounded-xl border border-zinc-200 bg-white xl:block dark:border-zinc-800 dark:bg-zinc-900"
  >
    <div class="space-y-0 divide-y divide-zinc-100 dark:divide-zinc-800">
      <div v-for="row in 8" :key="row" class="grid grid-cols-5 gap-4 px-4 py-3">
        <AppSkeleton class="h-4 w-full" />
        <AppSkeleton class="h-4 w-24" />
        <AppSkeleton class="h-5 w-16 rounded-full" />
        <AppSkeleton class="h-5 w-16 rounded-full" />
        <AppSkeleton class="h-4 w-16" />
      </div>
    </div>
  </div>
</template>
