<script setup lang="ts">
import { computed } from 'vue'
import { Menu, Plus, Search } from '@lucide/vue'
import BulkBar from '@/components/BulkBar.vue'
import FilterChips from '@/components/FilterChips.vue'
import ItemPanel from '@/components/ItemPanel.vue'
import QueueSkeleton from '@/components/QueueSkeleton.vue'
import QueueTable from '@/components/QueueTable.vue'
import ItemEditor from '@/components/ItemEditor.vue'
import { usePersona } from '@/composables/usePersona'
import { useQueue } from '@/composables/useQueue'
import { useUi } from '@/composables/useUi'
import { editableSelection } from '@/display/itemDisplay'
import { btnGhost, btnPrimary, fieldClass } from '@/ui/classes'

const {
  page,
  catalogError,
  error,
  searchDraft,
  skeleton,
  updating,
  openId,
  openItem,
  audit,
  focusReview,
  openError,
  reviewError,
  reviewPending,
  applySearch,
  setPerPage,
  closePanel,
  goToPage,
  onCreated,
  onEdited,
  reviewOpen,
  selectedCount,
  selectedIds,
} = useQueue()

const { canSubmit, currentName } = usePersona()
const { editor, navOpen, openSubmit, openEdit, closeEditor } = useUi()

const selectedForUpdate = computed(() =>
  editableSelection(page.value?.data ?? [], selectedIds.value, currentName.value),
)

function updateSelected(): void {
  const item = selectedForUpdate.value
  if (item === null) {
    return
  }
  openEdit(item)
}

function onEditorSaved(item: Parameters<typeof onCreated>[0]): void {
  const wasEdit = editor.value?.mode === 'edit'
  closeEditor()
  if (wasEdit) {
    onEdited(item)
    return
  }
  onCreated(item)
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
    <header
      class="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-zinc-200 bg-zinc-50 px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950 lg:px-6"
    >
      <div class="flex items-center gap-3">
        <button type="button" :class="btnGhost" class="lg:hidden" @click="navOpen = true">
          <Menu class="size-4" />
          Menu
        </button>
        <div>
          <div class="flex items-center gap-3">
            <h1 class="text-xl font-semibold tracking-tight">Review Queue</h1>
            <button
              v-if="selectedForUpdate"
              type="button"
              :class="btnPrimary"
              class="h-8"
              @click="updateSelected"
            >
              Update
            </button>
          </div>
          <p v-if="page" class="text-sm text-zinc-500">
            {{ page.meta.total }} items
            <span v-if="selectedCount > 0" class="text-orange-700 dark:text-orange-300">
              · {{ selectedCount }} selected
            </span>
          </p>
          <p v-else class="text-sm text-zinc-500">Loading queue…</p>
        </div>
      </div>
      <div class="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
        <form class="min-w-48 max-w-sm flex-1" @submit.prevent="applySearch">
          <label class="relative block">
            <Search class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
            <input
              v-model="searchDraft"
              type="text"
              :class="fieldClass"
              class="h-9 w-full cursor-text pl-9"
              placeholder="Search items…"
              aria-label="Search"
              autocomplete="off"
            />
          </label>
        </form>
        <button v-if="canSubmit" type="button" :class="btnPrimary" @click="openSubmit()">
          <Plus class="size-4" />
          Submit item
        </button>
      </div>
    </header>
    <p v-if="catalogError" class="shrink-0 px-4 pt-2 text-sm text-red-600 lg:px-6">{{ catalogError }}</p>
    <div class="shrink-0">
      <FilterChips />
    </div>

    <div
      class="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-4 lg:px-6"
      :class="updating ? 'opacity-60 transition-opacity' : ''"
    >
      <p
        v-if="error"
        class="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
      >
        {{ error }}
      </p>
      <QueueSkeleton v-else-if="skeleton || page === null" />
      <QueueTable v-else :items="page.data" />
    </div>

    <BulkBar />

    <footer
      v-if="page"
      class="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-zinc-200 px-4 py-3 text-sm text-zinc-500 dark:border-zinc-800 lg:px-6"
    >
      <p>
        Showing page {{ page.meta.current_page }} of {{ page.meta.last_page }} ·
        {{ page.meta.total }} items
      </p>
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          :class="btnGhost"
          :disabled="page.meta.current_page <= 1"
          @click="goToPage(page.meta.current_page - 1)"
        >
          Previous
        </button>
        <button
          type="button"
          :class="btnGhost"
          :disabled="page.meta.current_page >= page.meta.last_page"
          @click="goToPage(page.meta.current_page + 1)"
        >
          Next
        </button>
        <select
          :value="page.meta.per_page"
          :class="fieldClass"
          class="h-9 w-24 cursor-pointer pr-8"
          aria-label="Per page"
          @change="setPerPage(Number(($event.target as HTMLSelectElement).value))"
        >
          <option :value="5">5</option>
          <option :value="15">15</option>
          <option :value="25">25</option>
          <option :value="50">50</option>
        </select>
      </div>
    </footer>
  </div>

  <Teleport to="body">
    <Transition name="sheet">
      <ItemPanel
        v-if="openId !== null"
        :item="openItem"
        :item-id="openId"
        :audit="audit"
        :focus-review="focusReview"
        :error="openError"
        :review-error="reviewError"
        :review-pending="reviewPending"
        @close="closePanel"
        @review="reviewOpen"
      />
    </Transition>
    <Transition name="dialog">
      <div
        v-if="editor !== null"
        class="fixed inset-0 z-[80] flex items-center justify-center bg-zinc-950/40 p-4"
        @click.self="closeEditor()"
      >
        <div
          class="dialog-panel w-full max-w-2xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
        >
          <ItemEditor :item="editor.item" @saved="onEditorSaved" @close="closeEditor()" />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
