<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { X } from '@lucide/vue'
import { fetchAudit, saveAuthorCopy, submitItem } from '@/api/items'
import StatusChip from '@/components/StatusChip.vue'
import { usePersona } from '@/composables/usePersona'
import { eventActorName, formatTimestamp, outstandingNeeds, personName } from '@/display/itemDisplay'
import {
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  TITLE_MAX,
  TITLE_MIN,
  descriptionError,
  itemCopyIsValid,
  titleError,
} from '@/contentLimits'
import { overlayKeydown } from '@/display/sheetA11y'
import { auditQueryKey } from '@/query/queryKeys'
import type { Item } from '@/types/api'
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
const titleTouched = ref(false)
const descriptionTouched = ref(false)
const formRef = ref<HTMLElement | null>(null)
let restoreFocus: HTMLElement | null = null

const auditQuery = useQuery({
  queryKey: computed(() => auditQueryKey(props.item?.id ?? 0)),
  queryFn: () => fetchAudit(props.item!.id),
  enabled: computed(() => props.item !== null),
})

const isEdit = computed(() => props.item !== null)
const titleHint = computed(() => titleError(title.value))
const descriptionHint = computed(() => descriptionError(description.value))
const showTitleError = computed(() => titleTouched.value && titleHint.value !== null)
const showDescriptionError = computed(() => descriptionTouched.value && descriptionHint.value !== null)
const canSubmit = computed(() => itemCopyIsValid(title.value, description.value) && !pending.value)
const needs = computed(() => outstandingNeeds(auditQuery.data.value ?? []))

function fill(item: Item | null): void {
  title.value = item?.title ?? ''
  description.value = item?.description ?? ''
  error.value = null
  titleTouched.value = item !== null
  descriptionTouched.value = item !== null
}

watch(
  () => props.item,
  (item) => {
    fill(item)
  },
  { immediate: true },
)

onMounted(async () => {
  restoreFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  await nextTick()
  document.getElementById('item-editor-title-field')?.focus()
})

onUnmounted(() => {
  restoreFocus?.focus()
})

function onEditorKeydown(event: KeyboardEvent): void {
  overlayKeydown(event, {
    paused: false,
    root: formRef.value,
    onEscape: () => emit('close'),
  })
}

async function onSubmit(): Promise<void> {
  titleTouched.value = true
  descriptionTouched.value = true
  if (!itemCopyIsValid(title.value, description.value)) {
    return
  }
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
    const saved = await saveAuthorCopy(props.item, {
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
  <form
    ref="formRef"
    class="flex max-h-[min(90dvh,44rem)] flex-col"
    @submit.prevent="onSubmit"
    @keydown="onEditorKeydown"
  >
    <div class="flex items-start justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
      <div>
        <h2 id="item-editor-title" class="text-lg font-semibold">
          {{ isEdit ? 'Update item' : 'Submit content' }}
        </h2>
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

      <section v-if="needs.length > 0" class="space-y-2">
        <p class="text-[11px] font-semibold uppercase tracking-wide text-orange-800 dark:text-orange-200">
          What needs to change
        </p>
        <article
          v-for="row in needs"
          :key="row.id"
          class="rounded-xl border border-orange-200 bg-orange-50 px-3 py-3 dark:border-orange-500/30 dark:bg-orange-500/10"
        >
          <p class="text-xs text-orange-800/80 dark:text-orange-100/80">
            {{ personName(eventActorName(row)) }} · {{ formatTimestamp(row.created_at) }}
          </p>
          <p class="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{{ row.note }}</p>
        </article>
      </section>

      <label class="block space-y-1.5">
        <span class="flex items-center justify-between text-sm font-medium">
          Title
          <span class="text-xs font-normal text-zinc-400">{{ title.trim().length }}/{{ TITLE_MAX }} · min {{ TITLE_MIN }}</span>
        </span>
        <input
          id="item-editor-title-field"
          v-model="title"
          type="text"
          name="title"
          :maxlength="TITLE_MAX"
          :class="fieldFullClass"
          :aria-invalid="showTitleError"
          aria-describedby="title-error"
          class="h-11 text-base"
          placeholder="What is this content?"
          aria-label="Title"
          @input="titleTouched = true"
        />
        <p v-if="showTitleError" id="title-error" class="text-xs text-red-600 dark:text-red-400">{{ titleHint }}</p>
      </label>

      <label class="block space-y-1.5">
        <span class="flex items-center justify-between text-sm font-medium">
          Description
          <span class="text-xs font-normal text-zinc-400">{{ description.trim().length }}/{{ DESCRIPTION_MAX }} · min {{ DESCRIPTION_MIN }}</span>
        </span>
        <textarea
          v-model="description"
          name="description"
          :maxlength="DESCRIPTION_MAX"
          rows="10"
          :class="fieldFullClass"
          :aria-invalid="showDescriptionError"
          aria-describedby="description-error"
          class="min-h-48 resize-y text-base leading-relaxed"
          placeholder="Classroom-ready copy. Address any reviewer comments above."
          aria-label="Description"
          @input="descriptionTouched = true"
        />
        <p v-if="showDescriptionError" id="description-error" class="text-xs text-red-600 dark:text-red-400">
          {{ descriptionHint }}
        </p>
      </label>
    </div>

    <div class="border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
      <button type="submit" :class="btnPrimary" class="w-full" :disabled="!canSubmit">
        {{ isEdit ? 'Update' : 'Submit' }}
      </button>
      <p v-if="error" class="mt-2 text-sm text-red-600 dark:text-red-400">{{ error }}</p>
    </div>
  </form>
</template>
