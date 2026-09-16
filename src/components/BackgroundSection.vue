<script setup lang="ts">
import type { EducationItem, Locale, SpokenLanguage, UiLabels } from '@/types/resume'
import { formatPeriod } from './resume/period'

const props = defineProps<{
  education: EducationItem[]
  languages: SpokenLanguage[]
  locale: Locale
  labels: UiLabels
}>()

function period(item: EducationItem) {
  return formatPeriod(item.start, item.end, props.locale, props.labels.present)
}
</script>

<template>
  <div class="background-grid education-language-grid">
    <article class="content-card education-card">
      <h3>{{ labels.education }}</h3>

      <ul class="record-list education-list">
        <li v-for="item in education" :key="item.id" class="education-item">
          <p class="record-list__title">
            {{ item.qualification }}
            <!-- The space goes through the expression: the compiler trims a leading literal one. -->
            <span v-if="item.honors" class="education-item__honors">{{ ` ${item.honors}` }}</span>
          </p>
          <p class="record-list__detail">{{ item.institution }}</p>
          <p class="record-list__meta education-item__period">{{ period(item) }}</p>
        </li>
      </ul>
    </article>

    <article class="content-card languages-card">
      <h3>{{ labels.languages }}</h3>

      <ul class="record-list language-list">
        <li v-for="language in languages" :key="language.code" class="language-row">
          <div class="language-row__identity">
            <span class="language-code" aria-hidden="true">{{ language.code }}</span>
            <p class="record-list__title language-row__name">{{ language.name }}</p>
          </div>
          <p class="record-list__meta language-row__level">{{ language.level }}</p>
        </li>
      </ul>
    </article>
  </div>
</template>
