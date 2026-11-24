<script setup lang="ts">
import ItemPanel from '@/components/ItemPanel.vue'
import QueueTable from '@/components/QueueTable.vue'
import { useQueue } from '@/composables/useQueue'

const {
  page,
  catalogError,
  error,
  searchDraft,
  statusOptions,
  selectedStatus,
  openId,
  openItem,
  openError,
  applySearch,
  setStatus,
  openPanel,
  closePanel,
  goToPage,
} = useQueue()
</script>

<template>
  <div class="queue">
    <header>
      <h1>Review Queue</h1>
      <form @submit.prevent="applySearch">
        <input
          v-model="searchDraft"
          type="search"
          name="q"
          placeholder="Search title or description"
          aria-label="Search"
        />
        <select
          :value="selectedStatus"
          aria-label="Status"
          @change="setStatus(($event.target as HTMLSelectElement).value)"
        >
          <option value="">All statuses</option>
          <option v-for="option in statusOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <button type="submit">Search</button>
      </form>
    </header>

    <p v-if="catalogError">{{ catalogError }}</p>
    <p v-if="error">{{ error }}</p>
    <p v-else-if="page === null">Loading queue…</p>
    <p v-else-if="page.data.length === 0">No items match these filters.</p>

    <div v-else class="layout" :class="{ split: openId !== null }">
      <QueueTable :items="page.data" :open-id="openId" @open="openPanel" />
      <ItemPanel
        v-if="openId !== null"
        :item="openItem"
        :item-id="openId"
        :error="openError"
        @close="closePanel"
      />
    </div>

    <p v-if="page" class="pager">
      <button
        type="button"
        :disabled="page.meta.current_page <= 1"
        @click="goToPage(page.meta.current_page - 1)"
      >
        Previous
      </button>
      Page {{ page.meta.current_page }} of {{ page.meta.last_page }} · {{ page.meta.total }} items
      <button
        type="button"
        :disabled="page.meta.current_page >= page.meta.last_page"
        @click="goToPage(page.meta.current_page + 1)"
      >
        Next
      </button>
    </p>
  </div>
</template>

<style scoped>
.queue {
  max-width: 72rem;
  margin: 2rem auto;
  padding: 0 1rem 2rem;
}
header,
form,
.pager {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1rem;
  align-items: start;
}
.layout.split {
  grid-template-columns: minmax(0, 1fr) minmax(16rem, 20rem);
}
</style>
