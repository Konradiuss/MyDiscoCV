<script setup lang="ts">
import type { ProjectItem, UiLabels } from '@/types/resume'
import ProjectCard from './ProjectCard.vue'

defineProps<{
  items: ProjectItem[]
  labels: UiLabels
}>()
</script>

<template>
  <div class="project-grid">
    <ProjectCard v-for="item in items" :key="item.id" :item="item" :labels="labels" />
  </div>
</template>
