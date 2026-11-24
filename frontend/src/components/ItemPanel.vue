<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { ChevronDown, X } from '@lucide/vue'
import ReviewActions from '@/components/ReviewActions.vue'
import StatusChip from '@/components/StatusChip.vue'
import AppSkeleton from '@/components/ui/AppSkeleton.vue'
import { usePersona } from '@/composables/usePersona'
import { useUi } from '@/composables/useUi'
import {
  canEditItem,
  canReviewItem,
  eventActorName,
  flagLine,
  formatTimestamp,
  hasFlags,
  historyKindLabel,
  outstandingNeeds,
  personName,
  reviewEffect,
} from '@/display/itemDisplay'
import {
  focusableElements,
  historyPanelView,
  layerPaused,
  nextPanelTab,
  overlayKeydown,
  type PanelTab,
} from '@/display/sheetA11y'
import type { Item, Review } from '@/types/api'
import { btnGhost, btnPrimary } from '@/ui/classes'

const props = defineProps<{
  item: Item | null
  itemId: string
  audit: Review[]
  auditPending: boolean
  auditError: string | null
  focusReview: boolean
  error: string | null
  canRetry: boolean
  reviewError: string | null
  reviewPending: boolean
}>()

const emit = defineEmits<{
  close: []
  retry: []
  retryAudit: []
  review: [payload: { decision: string; note: string | null }]
}>()

const { currentName, canReview: personaCanReview } = usePersona()
const { activeModal, openEdit, setPanelMounted } = useUi()

const canReview = computed(
  () => props.item !== null && canReviewItem(props.item, currentName.value),
)
const canEdit = computed(() => props.item !== null && canEditItem(props.item, currentName.value))
const flags = computed(() => props.item?.flags ?? [])
const showFlags = computed(() => hasFlags(flags.value))
const history = computed(() => props.audit)
const needs = computed(() => outstandingNeeds(props.audit))
const historyView = computed(() =>
  historyPanelView({
    pending: props.auditPending,
    error: props.auditError,
    length: history.value.length,
  }),
)
const paused = computed(() => layerPaused('panel', activeModal.value))
const tabsEnabled = computed(() => props.item !== null)
const openCycle = ref<number | null>(null)
const tab = ref<PanelTab>('details')
const sheetRef = ref<HTMLElement | null>(null)
let restoreFocus: HTMLElement | null = null

watch(
  () => props.itemId,
  () => {
    openCycle.value = null
    tab.value = 'details'
  },
)

function toggleCycle(id: number): void {
  openCycle.value = openCycle.value === id ? null : id
}

async function focusReviewNote(): Promise<void> {
  tab.value = 'details'
  await nextTick()
  document.getElementById('item-review-actions')?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  document.getElementById('item-review-note')?.focus()
}

function onSheetKeydown(event: KeyboardEvent): void {
  overlayKeydown(event, {
    paused: paused.value,
    root: sheetRef.value,
    onEscape: () => emit('close'),
  })
}

function onTabListKeydown(event: KeyboardEvent): void {
  if (!tabsEnabled.value) {
    return
  }
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home' && event.key !== 'End') {
    return
  }
  event.preventDefault()
  tab.value = nextPanelTab(tab.value, event.key)
  document.getElementById(`item-tab-${tab.value}`)?.focus()
}

onMounted(async () => {
  setPanelMounted(true)
  restoreFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  await nextTick()
  if (props.focusReview) {
    await focusReviewNote()
    return
  }
  const root = sheetRef.value
  if (root !== null) {
    focusableElements(root)[0]?.focus()
  }
})

onUnmounted(() => {
  setPanelMounted(false)
  restoreFocus?.focus()
})

watch(
  () => [props.focusReview, props.item?.id],
  async () => {
    if (!props.focusReview) {
      return
    }
    await focusReviewNote()
  },
)
</script>

<template>
  <div
    ref="sheetRef"
    class="fixed inset-0 z-50 flex justify-end"
    :inert="paused"
    @keydown="onSheetKeydown"
  >
    <button
      type="button"
      tabindex="-1"
      class="absolute inset-0 cursor-pointer bg-zinc-950/40"
      aria-label="Close item panel"
      @click="emit('close')"
    />
    <aside
      role="dialog"
      aria-modal="true"
      aria-labelledby="item-panel-title"
      class="sheet-panel relative flex h-full w-full max-w-lg flex-col border-l border-zinc-200 bg-white text-zinc-900 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
    >
      <div
        class="flex items-start justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800"
      >
        <div>
          <p class="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Item {{ itemId }}
          </p>
          <h2 id="item-panel-title" class="mt-1 text-lg font-semibold leading-snug">
            {{ item?.title ?? `Item ${itemId}` }}
          </h2>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <button
            v-if="item && canEdit"
            type="button"
            :class="btnPrimary"
            class="h-9"
            @click="openEdit(item)"
          >
            Update
          </button>
          <button type="button" :class="btnGhost" @click="emit('close')">
            <X class="size-4" />
            Close
          </button>
        </div>
      </div>

      <div
        class="grid shrink-0 grid-cols-2 border-b border-zinc-200 px-2 dark:border-zinc-800"
        role="tablist"
        aria-label="Item panel"
        @keydown="onTabListKeydown"
      >
        <button
          id="item-tab-details"
          type="button"
          role="tab"
          class="cursor-pointer px-3 py-2.5 text-sm font-medium"
          :class="
            tab === 'details'
              ? 'border-b-2 border-orange-500 text-zinc-900 dark:text-zinc-50'
              : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          "
          :disabled="!tabsEnabled"
          :aria-selected="tab === 'details'"
          aria-controls="item-panel-details"
          :tabindex="tabsEnabled && tab === 'details' ? 0 : -1"
          @click="tab = 'details'"
        >
          Details
        </button>
        <button
          id="item-tab-history"
          type="button"
          role="tab"
          class="cursor-pointer px-3 py-2.5 text-sm font-medium"
          :class="
            tab === 'history'
              ? 'border-b-2 border-orange-500 text-zinc-900 dark:text-zinc-50'
              : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          "
          :disabled="!tabsEnabled"
          :aria-selected="tab === 'history'"
          aria-controls="item-panel-history"
          :tabindex="tabsEnabled && tab === 'history' ? 0 : -1"
          @click="tab = 'history'"
        >
          History
          <span v-if="historyView === 'ready'" class="ml-1 text-xs font-normal text-zinc-400">{{
            history.length
          }}</span>
        </button>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div
          v-if="item && tab === 'details'"
          id="item-panel-details"
          role="tabpanel"
          aria-labelledby="item-tab-details"
          class="space-y-5"
        >
            <div class="flex flex-wrap items-center gap-2">
              <StatusChip :status="item.status" />
              <StatusChip v-if="item.risk" :risk="item.risk" />
            </div>

            <section v-if="needs.length > 0" class="space-y-2">
              <h3 class="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                What needs to change
              </h3>
              <ul class="space-y-2">
                <li
                  v-for="row in needs"
                  :key="row.id"
                  class="rounded-xl border border-orange-200 bg-orange-50 px-3 py-3 dark:border-orange-500/30 dark:bg-orange-500/10"
                >
                  <p class="text-xs text-orange-800/80 dark:text-orange-100/80">
                    {{ personName(eventActorName(row)) }} · {{ formatTimestamp(row.created_at) }}
                  </p>
                  <p class="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{{ row.note }}</p>
                </li>
              </ul>
            </section>

            <section>
              <h3 class="text-xs font-semibold uppercase tracking-wide text-zinc-500">Content</h3>
              <p class="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                {{ item.description }}
              </p>
            </section>

            <section>
              <h3 class="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Heuristic flags
              </h3>
              <p class="mt-1 text-sm text-zinc-500">score {{ item.risk_score }}</p>
              <ul v-if="showFlags" class="mt-2 space-y-2">
                <li
                  v-for="flag in flags"
                  :key="flag.key"
                  class="rounded-xl bg-zinc-50 px-3 py-2 text-sm text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
                >
                  {{ flagLine(flag) }}
                </li>
              </ul>
              <p v-else class="mt-2 text-sm text-zinc-500">No heuristic flags.</p>
            </section>

            <section class="space-y-2">
              <h3 class="text-xs font-semibold uppercase tracking-wide text-zinc-500">About this item</h3>
              <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
                <dt class="text-zinc-500">Submitter</dt>
                <dd>{{ personName(item.submitter?.name) }}</dd>
                <dt class="text-zinc-500">Created</dt>
                <dd>{{ formatTimestamp(item.created_at) }}</dd>
                <dt class="text-zinc-500">Updated</dt>
                <dd>{{ formatTimestamp(item.updated_at) }}</dd>
                <dt class="text-zinc-500">Suggested</dt>
                <dd class="capitalize">{{ item.suggested_decision ?? '—' }}</dd>
                <dt class="text-zinc-500">Confidence</dt>
                <dd class="capitalize">{{ item.confidence ?? '—' }}</dd>
              </dl>
            </section>
        </div>
        <div
          v-else-if="item && tab === 'history'"
          id="item-panel-history"
          role="tabpanel"
          aria-labelledby="item-tab-history"
        >
          <div v-if="historyView === 'loading'" class="space-y-3">
            <AppSkeleton class="h-16 w-full" />
            <AppSkeleton class="h-16 w-full" />
          </div>
          <div v-else-if="historyView === 'error'" class="space-y-3">
            <p class="text-sm text-red-600 dark:text-red-400">{{ auditError }}</p>
            <button type="button" :class="btnPrimary" class="h-9" @click="emit('retryAudit')">
              Retry
            </button>
          </div>
          <p v-else-if="historyView === 'empty'" class="text-sm text-zinc-500">No changes yet.</p>
          <ul v-else class="space-y-3">
            <li
              v-for="row in history"
              :key="row.id"
              class="rounded-xl border border-zinc-200 bg-zinc-50 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
            >
              <button
                type="button"
                class="flex w-full cursor-pointer items-start gap-2 px-3 py-3 text-left"
                :aria-expanded="openCycle === row.id"
                @click="toggleCycle(row.id)"
              >
                <div class="min-w-0 flex-1 space-y-2">
                  <div class="flex flex-wrap items-center gap-2">
                    <StatusChip v-if="row.kind === 'reviewed' && row.decision" :status="row.decision" />
                    <span
                      v-else
                      class="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium capitalize text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                    >
                      {{ historyKindLabel(row) }}
                    </span>
                    <p class="text-xs text-zinc-500">
                      {{ personName(eventActorName(row)) }}
                      ·
                      {{ formatTimestamp(row.created_at) }}
                    </p>
                  </div>
                  <p v-if="row.note" class="whitespace-pre-wrap leading-relaxed">{{ row.note }}</p>
                </div>
                <ChevronDown
                  class="mt-0.5 size-4 shrink-0 text-zinc-400 transition"
                  :class="openCycle === row.id ? 'rotate-180' : ''"
                />
              </button>
              <div v-if="openCycle === row.id" class="space-y-3 border-t border-zinc-200 px-3 py-3 dark:border-zinc-800">
                <template v-if="row.snapshot">
                  <p
                    v-if="row.kind === 'reviewed' && row.decision"
                    class="text-sm text-zinc-700 dark:text-zinc-300"
                  >
                    {{
                      reviewEffect(
                        row.decision,
                        row.snapshot.suggested_decision,
                        row.snapshot.risk_score,
                      )
                    }}
                  </p>
                  <div class="flex flex-wrap items-center gap-2">
                    <StatusChip v-if="row.snapshot.risk" :risk="row.snapshot.risk" />
                    <span class="text-xs text-zinc-500">score {{ row.snapshot.risk_score }}</span>
                    <span class="text-xs capitalize text-zinc-500">
                      suggested {{ row.snapshot.suggested_decision ?? '—' }}
                    </span>
                  </div>
                  <ul v-if="hasFlags(row.snapshot.flags)" class="space-y-1">
                    <li
                      v-for="flag in row.snapshot.flags"
                      :key="flag.key"
                      class="text-xs text-zinc-600 dark:text-zinc-400"
                    >
                      {{ flagLine(flag) }}
                    </li>
                  </ul>
                  <div>
                    <p class="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                      {{ row.kind === 'reviewed' ? 'Copy at this grade' : 'Copy at this change' }}
                    </p>
                    <p class="mt-1 font-medium">{{ row.snapshot.title }}</p>
                    <p class="mt-1 whitespace-pre-wrap text-zinc-600 dark:text-zinc-400">
                      {{ row.snapshot.description }}
                    </p>
                  </div>
                </template>
                <p v-else class="text-sm text-zinc-500">
                  Snapshot was not stored for this change.
                </p>
              </div>
            </li>
          </ul>
        </div>
        <div
          v-else
          id="item-panel-status"
          :role="error ? 'alert' : 'status'"
          aria-live="polite"
          class="space-y-3"
        >
          <template v-if="error">
            <p class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
            <div class="flex flex-wrap gap-2">
              <button
                v-if="canRetry"
                type="button"
                :class="btnPrimary"
                class="h-9"
                @click="emit('retry')"
              >
                Retry
              </button>
              <button type="button" :class="btnGhost" class="h-9" @click="emit('close')">
                Close
              </button>
            </div>
          </template>
          <template v-else>
            <AppSkeleton class="h-4 w-full" />
            <AppSkeleton class="h-4 w-5/6" />
            <AppSkeleton class="h-24 w-full" />
          </template>
        </div>
      </div>

      <div
        v-if="item"
        class="border-t border-zinc-200 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-950"
      >
        <ReviewActions
          v-if="canReview"
          :item-id="itemId"
          :pending="reviewPending"
          :error="reviewError"
          @review="emit('review', $event)"
        />
        <p v-else-if="canEdit" class="text-sm text-zinc-500">
          <template v-if="item.status === 'needs_work'">
            Sent back for edits. Update the copy and send it back to the queue.
          </template>
          <template v-else>You submitted this. You can still update it before it is reviewed.</template>
        </p>
        <p v-else-if="!personaCanReview" class="text-sm text-zinc-500">
          This persona can submit, but not review. Switch to a reviewer to decide.
        </p>
        <p v-else-if="item.status === 'needs_work'" class="text-sm text-zinc-500">
          Sent back for edits. Open History for earlier grades. It can be reviewed again after the
          submitter resubmits.
        </p>
        <p v-else class="text-sm text-zinc-500">This item is not waiting for a review.</p>
      </div>
    </aside>
  </div>
</template>
