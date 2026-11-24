<script setup lang="ts">
import { useToast } from '@/composables/useToast'

const { toasts, dismiss } = useToast()
</script>

<template>
  <div class="pointer-events-none fixed top-4 right-4 z-[80] flex w-80 flex-col gap-2">
    <TransitionGroup name="toast">
    <button
      v-for="toast in toasts"
      :key="toast.id"
      type="button"
      class="pointer-events-auto cursor-pointer rounded-xl border px-3 py-2 text-left text-sm shadow-lg"
      :class="{
        'border-zinc-200 bg-white text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100':
          toast.tone === 'info',
        'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100':
          toast.tone === 'success',
        'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-100':
          toast.tone === 'error',
      }"
      @click="dismiss(toast.id)"
    >
      {{ toast.message }}
    </button>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition:
    transform 0.28s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.28s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(110%);
}

.toast-move {
  transition: transform 0.28s ease;
}
</style>
