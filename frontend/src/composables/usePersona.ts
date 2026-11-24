import { computed, ref } from 'vue'
import { PERSONAS, canReviewAs, canSubmitAs, personaByName, roleLabel } from '@/personas'

/** Shared across App header, submit form, and review actions. */
const currentName = ref('Alice Johnson')

export function usePersona() {
  const current = computed(() => personaByName(currentName.value))
  const canSubmit = computed(() => canSubmitAs(currentName.value))
  const canReview = computed(() => canReviewAs(currentName.value))

  function setCurrent(name: string): void {
    currentName.value = name
  }

  return {
    personas: PERSONAS,
    currentName,
    current,
    canSubmit,
    canReview,
    roleLabel: computed(() => roleLabel(current.value)),
    setCurrent,
  }
}
