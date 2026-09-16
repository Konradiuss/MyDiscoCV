<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { resolveDocument } from '@/data/resumeAssets'
import type { ProfileContent, UiLabels } from '@/types/resume'
import { getMillisecondsToNextMinute } from './controls/clock'
import ContactAvatar from './ContactAvatar.vue'
import ContactMark from './ContactMark.vue'
import { formatLocalTime } from './resume/localTime'

const props = defineProps<{
  profile: ProfileContent
  labels: UiLabels
}>()

const pdf = computed(() => resolveDocument(props.profile.resumePdf))

const pdfName = computed(
  () => `${props.profile.name.replace(/\s+/g, '-')}-${props.profile.resumePdf}`,
)

const now = ref(new Date())
const localTime = computed(() => formatLocalTime(now.value, props.profile.timezone))
let clockTimer: ReturnType<typeof setTimeout> | null = null

function tickClock() {
  now.value = new Date()
  if (clockTimer !== null) clearTimeout(clockTimer)
  clockTimer = setTimeout(tickClock, getMillisecondsToNextMinute(now.value))
}

function resyncClock() {
  if (document.visibilityState === 'visible') tickClock()
}

onMounted(() => {
  tickClock()
  document.addEventListener('visibilitychange', resyncClock)
})

onBeforeUnmount(() => {
  if (clockTimer !== null) clearTimeout(clockTimer)
  document.removeEventListener('visibilitychange', resyncClock)
})
</script>

<template>
  <section class="hero-section" aria-labelledby="hero-title">
    <h1 id="hero-title">{{ profile.name }}</h1>
    <p class="hero-section__title">{{ profile.title }}</p>
    <p v-if="profile.summary" class="hero-section__summary">{{ profile.summary }}</p>

    <div class="hero-section__meta">
      <span>{{ profile.location }}</span>
      <span class="hero-section__timezone">
        {{ profile.timezone }}
        <time :datetime="now.toISOString()">{{ localTime }}</time>
      </span>
      <span>{{ profile.availability }}</span>
    </div>

    <div class="hero-section__actions">
      <div class="hero-section__links" role="group" :aria-label="labels.contactLinks">
        <ContactAvatar
          v-for="contact in profile.contacts"
          :key="contact.url"
          :contact="contact"
          :labels="labels"
        />

        <a
          class="contact-avatar contact-avatar--markonly contact-avatar--resume"
          :href="pdf"
          :download="pdfName"
          :aria-label="labels.downloadPdf"
        >
          <span class="contact-avatar__frame">
            <span class="contact-avatar__badge" aria-hidden="true">
              <ContactMark name="cv" />
            </span>
          </span>

          <span class="contact-avatar__name" aria-hidden="true">{{ labels.downloadPdf }}</span>
        </a>
      </div>
    </div>
  </section>
</template>
