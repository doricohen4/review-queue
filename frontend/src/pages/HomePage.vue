<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { fetchHealth, type HealthResponse } from '@/api/health'

const health = ref<HealthResponse | null>(null)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    health.value = await fetchHealth()
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Could not reach the API'
  }
})
</script>

<template>
  <main class="home">
    <p class="eyebrow">BrainPOP · take-home</p>
    <h1>Review Queuett</h1>
    <p v-if="health" class="ok">API {{ health.status }} · {{ health.service }}</p>
    <p v-else-if="error" class="err">{{ error }}</p>
    <p v-else>Checking APIs…</p>
  </main>
</template>

<style scoped>
.home {
  max-width: 40rem;
  margin: 4rem auto;
  padding: 0 1.25rem;
  font-family: Inter, system-ui, sans-serif;
}
.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.7rem;
  color: #6b7280;
}
h1 {
  margin: 0.25rem 0 1rem;
}
.ok {
  color: #047857;
}
.err {
  color: #b91c1c;
}
</style>
