<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

const open = ref(false)

const props = withDefaults(
  defineProps<{
    align?: 'left' | 'right'
    side?: 'bottom' | 'left'
    wide?: boolean
  }>(),
  { align: 'left', side: 'bottom', wide: false },
)

const triggerEl = ref<HTMLElement | null>(null)
const panelEl = ref<HTMLElement | null>(null)
const coords = ref({ top: 0, left: 0 })

function place(): void {
  const box = triggerEl.value?.getBoundingClientRect()
  if (box === undefined) {
    return
  }
  const panel = panelEl.value
  const width = Math.max(panel?.offsetWidth ?? 224, 224)
  const height = panel?.offsetHeight ?? 0
  let left = props.align === 'right' ? box.right - width : box.left
  let top = box.bottom + 6

  if (props.side === 'left') {
    left = box.left - width - 8
    top = box.top + box.height / 2 - height / 2
    if (left < 8) {
      left = box.right + 8
    }
  } else if (height > 0 && top + height > window.innerHeight - 8) {
    top = Math.max(8, box.top - height - 6)
  }

  left = Math.max(8, Math.min(left, window.innerWidth - width - 8))
  top = Math.max(8, Math.min(top, window.innerHeight - height - 8))
  coords.value = { top, left }
}

async function toggle(): Promise<void> {
  open.value = !open.value
  if (open.value) {
    await nextTick()
    place()
  }
}

function close(): void {
  open.value = false
}

function onKey(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    close()
  }
}

function onPointerDown(event: PointerEvent): void {
  const target = event.target
  if (!(target instanceof Node)) {
    return
  }
  if (triggerEl.value?.contains(target) || panelEl.value?.contains(target)) {
    return
  }
  close()
}

onMounted(() => {
  document.addEventListener('pointerdown', onPointerDown)
  document.addEventListener('keydown', onKey)
  window.addEventListener('resize', close)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointerDown)
  document.removeEventListener('keydown', onKey)
  window.removeEventListener('resize', close)
})
</script>

<template>
  <div :class="wide ? 'block w-full' : 'inline-flex'">
    <div ref="triggerEl" @click="toggle">
      <slot name="trigger" :open="open" />
    </div>
    <Teleport to="body">
      <div
        v-if="open"
        ref="panelEl"
        class="fixed z-[70] min-w-52 rounded-xl border border-zinc-200 bg-white p-1.5 text-zinc-900 shadow-lg dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        :style="{ top: `${coords.top}px`, left: `${coords.left}px` }"
        role="menu"
      >
        <slot :close="close" />
      </div>
    </Teleport>
  </div>
</template>
