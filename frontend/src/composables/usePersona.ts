import { ref } from 'vue'
import { PERSONAS } from '@/personas'

/** Shared across App header, submit form, and review actions. */
const currentName = ref('Alice Johnson')

export function usePersona() {
  function setCurrent(name: string): void {
    currentName.value = name
  }

  return {
    personas: PERSONAS,
    currentName,
    setCurrent,
  }
}
