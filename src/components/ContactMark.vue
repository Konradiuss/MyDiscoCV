<script setup lang="ts">
import { computed } from 'vue'
import { resolveIcon } from '@/data/resumeAssets'

const props = defineProps<{
  name: string
}>()

const icon = computed(() => resolveIcon(`${props.name}.svg`))

const source = computed(() => `url(${JSON.stringify(icon.value)})`)
</script>

<template>
  <span
    class="contact-mark"
    :style="{ '--mark': source }"
    :data-kind="name"
    aria-hidden="true"
  ></span>
</template>
