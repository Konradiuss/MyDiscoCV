<script setup lang="ts">
import type { UiLabels, WorkProject } from '@/types/resume'
import ProjectShots from './ProjectShots.vue'

defineProps<{
  project: WorkProject
  labels: UiLabels
}>()
</script>

<template>
  <article class="work-project">
    <ProjectShots
      :shots="project.shots"
      :title="project.name"
      :labels="labels"
      class="work-project__shots"
    />

    <div class="work-project__body">
      <h4>{{ project.name }}</h4>
      <p>{{ project.description }}</p>

      <ul class="chip-list chip-list--compact" :aria-label="labels.technologyStack">
        <li v-for="tech in project.stack" :key="tech">{{ tech }}</li>
      </ul>
    </div>
  </article>
</template>
