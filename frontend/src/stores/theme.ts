import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

export type ThemeMode = 'light' | 'dark' | 'system'

function readMode(): ThemeMode {
  const stored = localStorage.getItem('theme')
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored
  }
  return 'system'
}

function systemDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>(readMode())
  const isDark = computed(() => (mode.value === 'system' ? systemDark() : mode.value === 'dark'))

  function apply(): void {
    document.documentElement.classList.toggle('dark', isDark.value)
    localStorage.setItem('theme', mode.value)
  }

  function setMode(next: ThemeMode): void {
    mode.value = next
  }

  watch(mode, apply, { immediate: true })

  return { mode, isDark, setMode }
})
