<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { X } from '@lucide/vue'
import { fetchAudit, submitItem, updateItem } from '@/api/items'
import StatusChip from '@/components/StatusChip.vue'
import { usePersona } from '@/composables/usePersona'
import { formatTimestamp, personName } from '@/display/itemDisplay'
import { DESCRIPTION_MAX, TITLE_MAX } from '@/personas'
import type { Item, Review } from '@/types/api'
import { btnGhost, btnPrimary, fieldFullClass } from '@/ui/classes'

const props = defineProps<{
  item: Item | null
}>()

const emit = defineEmits<{
  saved: [item: Item]
  close: []
}>()

const { currentName } = usePersona()
const title = ref('')
const description = ref('')
const error = ref<string | null>(null)
const pending = ref(false)
const comments = ref<Review[]>([])

const isEdit = computed(() => props.item !== null)
const titleLeft = computed(() => TITLE_MAX - title.value.length)
const descriptionLeft = computed(() => DESCRIPTION_MAX - description.value.length)
const latestComment = computed(() => {
  const withNotes = comments.value.filter((row) => row.note !== null && row.note !== '')
  return withNotes.at(-1) ?? null
})

function fill(item: Item | null): void {
  title.value = item?.title ?? ''
  description.value = item?.description ?? ''
  error.value = null
}

watch(
  () => props.item,
  async (item) => {
    fill(item)
    comments.value = []
    if (item === null) {
      return
    }
    try {
      comments.value = await fetchAudit(item.id)
    } catch {
      comments.value = []
    }
  },
  { immediate: true },
)

async function onSubmit(): Promise<void> {
  pending.value = true
  error.value = null
  try {
    if (props.item === null) {
      const created = await submitItem({
        title: title.value,
        description: description.value,
        submitter_name: currentName.value,
      })
      emit('saved', created)
      return
    }
    const saved = await updateItem(props.item.id, {
      title: title.value,
      description: description.value,
      submitter_name: currentName.value,
    })
    emit('saved', saved)
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Could not save'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <form class="flex max-h-[min(90dvh,44rem)] flex-col" @submit.prevent="onSubmit">
    <div class="flex items-start justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
      <div>
        <h2 class="text-lg font-semibold">{{ isEdit ? 'Update item' : 'Submit content' }}</h2>
        <p class="mt-1 text-sm text-zinc-500">
          As {{ currentName }}
          <template v-if="item?.status === 'needs_work'"> · saving sends this back to pending</template>
        </p>
      </div>
      <button type="button" :class="btnGhost" class="shrink-0 px-2" aria-label="Close" @click="emit('close')">
        <X class="size-4" />
      </button>
    </div>

    <div class="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
      <div v-if="item" class="flex flex-wrap items-center gap-2">
        <StatusChip :status="item.status" />
        <StatusChip v-if="item.risk" :risk="item.risk" />
        <span class="text-xs text-zinc-500">score {{ item.risk_score }}</span>
      </div>

      <section v-if="latestComment" class="rounded-xl border border-orange-200 bg-orange-50 px-3 py-3 dark:border-orange-500/30 dark:bg-orange-500/10">
        <p class="text-[11px] font-semibold uppercase tracking-wide text-orange-800 dark:text-orange-200">
          Reviewer asked
        </p>
        <p class="mt-1 text-xs text-orange-800/80 dark:text-orange-100/80">
          {{ personName(latestComment.reviewer?.name) }} · {{ formatTimestamp(latestComment.created_at) }}
        </p>
        <p class="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{{ latestComment.note }}</p>
      </section>

      <label class="block space-y-1.5">
        <span class="flex items-center justify-between text-sm font-medium">
          Title
          <span class="text-xs font-normal text-zinc-400">{{ titleLeft }} left</span>
        </span>
        <input
          v-model="title"
          type="text"
          name="title"
          required
          :maxlength="TITLE_MAX"
          :class="fieldFullClass"
          class="h-11 text-base"
          placeholder="What is this content?"
          aria-label="Title"
        />
      </label>

      <label class="block space-y-1.5">
        <span class="flex items-center justify-between text-sm font-medium">
          Description
          <span class="text-xs font-normal text-zinc-400">{{ descriptionLeft }} left</span>
        </span>
        <textarea
          v-model="description"
          name="description"
          required
          :maxlength="DESCRIPTION_MAX"
          rows="10"
          :class="fieldFullClass"
          class="min-h-48 resize-y text-base leading-relaxed"
          placeholder="Classroom-ready copy. Address any reviewer comments above."
          aria-label="Description"
        />
      </label>
    </div>

    <div class="border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
      <button type="submit" :class="btnPrimary" class="w-full" :disabled="pending">
        {{ isEdit ? 'Update' : 'Submit' }}
      </button>
      <p v-if="error" class="mt-2 text-sm text-red-600 dark:text-red-400">{{ error }}</p>
    </div>
  </form>
</template>
