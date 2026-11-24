<script setup lang="ts">
import { RouterView } from 'vue-router'
import { usePersona } from '@/composables/usePersona'

const { personas, currentName, setCurrent } = usePersona()
</script>

<template>
  <div>
    <p>
      <label>
        Acting as
        <select
          :value="currentName"
          aria-label="Acting as"
          @change="setCurrent(($event.target as HTMLSelectElement).value)"
        >
          <option v-for="persona in personas" :key="persona.name" :value="persona.name">
            {{ persona.name }} ({{ persona.role }})
          </option>
        </select>
      </label>
    </p>
    <RouterView />
  </div>
</template>
