<script setup lang="ts">
import { Inbox, Plus } from '@lucide/vue'
import { RouterLink, RouterView } from 'vue-router'
import AppSelect from '@/components/ui/AppSelect.vue'
import ToastStack from '@/components/ui/ToastStack.vue'
import { usePersona } from '@/composables/usePersona'
import { useUi } from '@/composables/useUi'
import { useThemeStore, type ThemeMode } from '@/stores/theme'

const { personas, currentName, canSubmit, roleLabel, setCurrent } = usePersona()
const { navOpen, openSubmit } = useUi()
const theme = useThemeStore()

const personaOptions = personas.map((persona) => ({
  value: persona.name,
  label: `${persona.name} · ${persona.roles.join(' · ')}`,
}))

const themeOptions = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]
</script>

<template>
  <div
    class="flex h-dvh overflow-hidden bg-zinc-50 font-sans text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100"
  >
    <div
      v-if="navOpen"
      class="fixed inset-0 z-30 bg-zinc-950/40 lg:hidden"
      @click="navOpen = false"
    />

    <aside
      class="fixed inset-y-0 left-0 z-40 flex h-dvh w-60 flex-col overflow-hidden border-r border-zinc-200 bg-white transition-transform duration-200 dark:border-zinc-800 dark:bg-zinc-950 lg:static"
      :class="navOpen ? 'translate-x-0' : 'max-lg:-translate-x-full'"
    >
      <div class="flex items-center gap-2.5 px-4 py-4">
        <span
          class="flex size-8 items-center justify-center rounded-lg bg-orange-500 text-sm font-semibold text-white"
          >Q</span
        >
        <div>
          <p class="text-sm font-semibold leading-tight">Review Queue</p>
          <p class="text-[11px] text-zinc-500">BrainPOP</p>
        </div>
      </div>

      <nav class="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-2 text-sm">
        <div>
          <p class="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Moderation
          </p>
          <RouterLink
            to="/"
            class="flex cursor-pointer items-center gap-2 rounded-lg bg-orange-50 px-2.5 py-2 font-medium text-orange-800 dark:bg-orange-500/15 dark:text-orange-200"
            @click="navOpen = false"
          >
            <Inbox class="size-4" />
            Queue
          </RouterLink>
          <button
            v-if="canSubmit"
            type="button"
            class="mt-0.5 flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
            @click="openSubmit()"
          >
            <Plus class="size-4" />
            Submit item
          </button>
        </div>
      </nav>

      <div class="shrink-0 space-y-3 border-t border-zinc-200 p-3 dark:border-zinc-800">
        <AppSelect
          :model-value="theme.mode"
          :options="themeOptions"
          label="Theme"
          @update:model-value="theme.setMode($event as ThemeMode)"
        />
        <AppSelect
          :model-value="currentName"
          :options="personaOptions"
          label="Acting as"
          @update:model-value="setCurrent"
        />
        <p class="px-1 text-xs capitalize text-zinc-500">
          {{ currentName }}
          <span v-if="roleLabel">· {{ roleLabel }}</span>
        </p>
      </div>
    </aside>

    <div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <RouterView />
    </div>
    <ToastStack />
  </div>
</template>
