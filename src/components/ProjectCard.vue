<script setup lang="ts">
import type { ProjectItem, UiLabels } from '@/types/resume'
import ProjectShots from './ProjectShots.vue'

defineProps<{
  item: ProjectItem
  labels: UiLabels
}>()
</script>

<template>
  <article class="content-card project-card">
    <ProjectShots
      :shots="item.shots"
      :title="item.name"
      :labels="labels"
      class="project-card__shots"
    />

    <div class="project-card__body">
      <h3>{{ item.name }}</h3>
      <p class="content-card__description">{{ item.description }}</p>

      <ul class="plain-list">
        <li v-for="(highlight, index) in item.highlights" :key="index">{{ highlight }}</li>
      </ul>

      <ul class="chip-list chip-list--compact" :aria-label="labels.technologyStack">
        <li v-for="tech in item.stack" :key="tech">{{ tech }}</li>
      </ul>

      <div v-if="item.githubUrl || item.demoUrl" class="project-card__links">
        <a
          v-if="item.githubUrl"
          :href="item.githubUrl"
          :aria-label="`GitHub — ${item.name}`"
          target="_blank"
          rel="noopener noreferrer"
          >GitHub</a
        >
        <a
          v-if="item.demoUrl"
          :href="item.demoUrl"
          :aria-label="`Demo — ${item.name}`"
          target="_blank"
          rel="noopener noreferrer"
          >Demo</a
        >
      </div>
    </div>
  </article>
</template>
