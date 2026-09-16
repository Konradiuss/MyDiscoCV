<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { localeOptions } from '@/data/resume'
import type { Locale } from '@/types/resume'

defineProps<{
  activeLocale: Locale
}>()
</script>

<template>
  <nav class="language-switcher" aria-label="Language">
    <RouterLink
      v-for="locale in localeOptions"
      :key="locale.code"
      class="language-switcher__item"
      :class="{ 'language-switcher__item--active': locale.code === activeLocale }"
      :to="{ name: 'resume', params: { locale: locale.code } }"
      :aria-current="locale.code === activeLocale ? 'page' : undefined"
    >
      <span>{{ locale.shortLabel }}</span>
      <small>{{ locale.label }}</small>
    </RouterLink>
  </nav>
</template>
