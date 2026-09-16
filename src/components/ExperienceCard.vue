<script setup lang="ts">
import { computed } from 'vue'
import type { ExperienceItem, Locale, UiLabels } from '@/types/resume'
import WorkProjectCard from './WorkProjectCard.vue'
import { formatDuration, formatPeriod, getDurationMonths } from './resume/period'

const props = defineProps<{
  item: ExperienceItem
  locale: Locale
  labels: UiLabels
}>()

const period = computed(() =>
  formatPeriod(props.item.start, props.item.end, props.locale, props.labels.present),
)

const duration = computed(() =>
  formatDuration(getDurationMonths(props.item.start, props.item.end, new Date()), props.locale),
)
</script>

<template>
  <article class="content-card experience-card">
    <div class="content-card__header">
      <div>
        <h3>{{ item.role }}</h3>
        <p class="experience-card__company">{{ item.company }}</p>
        <p v-if="item.previousRole" class="experience-card__promotion">
          <span aria-hidden="true">↑</span>
          {{ labels.promotedFrom }}: {{ item.previousRole }}
        </p>
        <p v-if="item.roleNote" class="experience-card__role-note">{{ item.roleNote }}</p>
      </div>
      <div class="content-card__meta">
        <span>{{ period }}</span>
        <span class="experience-card__duration">{{ duration }}</span>
        <span>{{ item.location }}</span>
      </div>
    </div>

    <p class="content-card__description">{{ item.description }}</p>

    <ul class="plain-list">
      <li v-for="(responsibility, index) in item.responsibilities" :key="index">
        {{ responsibility }}
      </li>
    </ul>

    <p v-for="(achievement, index) in item.achievements" :key="index" class="content-card__note">
      {{ achievement }}
    </p>

    <ul class="chip-list chip-list--compact" :aria-label="labels.technologyStack">
      <li v-for="tech in item.stack" :key="tech">{{ tech }}</li>
    </ul>

    <div v-if="item.projects.length > 0" class="experience-card__projects">
      <p class="experience-card__projects-title">{{ labels.workProjects }}</p>

      <div class="work-project-grid">
        <WorkProjectCard
          v-for="project in item.projects"
          :key="project.id"
          :project="project"
          :labels="labels"
        />
      </div>
    </div>
  </article>
</template>
