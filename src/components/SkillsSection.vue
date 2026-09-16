<script setup lang="ts">
import type { SkillGroup, SkillLevel, UiLabels } from '@/types/resume'

const props = defineProps<{
  groups: SkillGroup[]
  labels: UiLabels
}>()

const levels: SkillLevel[] = ['core', 'proficient', 'familiar']

const levelName = (level: SkillLevel) => props.labels.skillLevelNames[level]
const markerClass = (level: SkillLevel) => `skills-legend__marker--${level}`
const skillClass = (level: SkillLevel) => `skill-chip--${level}`
const skillLabel = (name: string, level: SkillLevel) => `${name}, ${levelName(level)}`
</script>

<template>
  <div class="skills-panel">
    <ul class="skills-legend" :aria-label="labels.skillLevels">
      <li v-for="level in levels" :key="level">
        <span class="skills-legend__marker" :class="markerClass(level)" />
        {{ levelName(level) }}
      </li>
    </ul>

    <div class="skills-panel__groups">
      <section v-for="group in groups" :key="group.name" class="skill-row">
        <h3>{{ group.name }}</h3>

        <ul class="skill-list" :aria-label="group.name">
          <li
            v-for="skill in group.skills"
            :key="skill.name"
            class="skill-chip"
            :class="skillClass(skill.level)"
            :aria-label="skillLabel(skill.name, skill.level)"
          >
            {{ skill.name }}
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
