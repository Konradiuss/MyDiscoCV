<script setup lang="ts">
import { computed } from 'vue'
import { resolveAvatar } from '@/data/resumeAssets'
import type { ContactLink, UiLabels } from '@/types/resume'
import ContactMark from './ContactMark.vue'

const props = defineProps<{
  contact: ContactLink
  labels: UiLabels
}>()

const avatar = computed(() =>
  props.contact.avatar === undefined ? null : resolveAvatar(props.contact.avatar),
)

const action = computed(() => props.labels.contactActions[props.contact.kind])

const external = computed(() => props.contact.kind !== 'email')
</script>

<template>
  <a
    class="contact-avatar"
    :class="{ 'contact-avatar--markonly': avatar === null }"
    :href="contact.url"
    :aria-label="action"
    :title="contact.label"
    :target="external ? '_blank' : undefined"
    :rel="external ? 'me noopener noreferrer' : 'me'"
  >
    <span class="contact-avatar__frame">
      <img v-if="avatar !== null" :src="avatar" alt="" loading="lazy" decoding="async" />

      <span class="contact-avatar__badge" aria-hidden="true">
        <ContactMark :name="contact.kind" />
      </span>
    </span>

    <span class="contact-avatar__name" aria-hidden="true">{{ action }}</span>
  </a>
</template>
