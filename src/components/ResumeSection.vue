<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  name: string
  title: string
  index: number
}>()

const headingId = computed(() => `${props.name}-title`)

const kicker = computed(() => String(props.index).padStart(2, '0'))
</script>

<template>
  <section class="resume-section" :aria-labelledby="headingId">
    <p class="section-kicker" aria-hidden="true">{{ kicker }}</p>
    <h2 :id="headingId">{{ title }}</h2>

    <slot />
  </section>
</template>
