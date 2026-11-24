<script setup lang="ts">
import { ref } from 'vue'
import { submitItem } from '@/api/items'
import { usePersona } from '@/composables/usePersona'
import { DESCRIPTION_MAX, TITLE_MAX } from '@/personas'
import type { Item } from '@/types/api'

const emit = defineEmits<{
  created: [item: Item]
}>()

const { currentName } = usePersona()
const title = ref('')
const description = ref('')
const error = ref<string | null>(null)
const pending = ref(false)

/** POST as the header persona (Alice submits; Bob should switch first). */
async function onSubmit(): Promise<void> {
  pending.value = true
  error.value = null
  try {
    const item = await submitItem({
      title: title.value,
      description: description.value,
      submitter_name: currentName.value,
    })
    title.value = ''
    description.value = ''
    emit('created', item)
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Could not submit'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <form @submit.prevent="onSubmit">
    <h2>Submit content</h2>
    <p>Submitting as {{ currentName }}</p>
    <input
      v-model="title"
      type="text"
      name="title"
      required
      :maxlength="TITLE_MAX"
      placeholder="Title"
      aria-label="Title"
    />
    <textarea
      v-model="description"
      name="description"
      required
      :maxlength="DESCRIPTION_MAX"
      rows="3"
      placeholder="Description"
      aria-label="Description"
    />
    <button type="submit" :disabled="pending">Submit</button>
    <p v-if="error">{{ error }}</p>
  </form>
</template>
