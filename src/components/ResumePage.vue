<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { readAudioLevels } from '@/audio/audioLevels'
import { startMusicPlayback, useMusicPlayer } from '@/audio/musicPlayer'
import { defaultLocale, isLocale, resumeByLocale } from '@/data/resume'
import {
  LOADING_MILESTONES,
  reportLoadingProgress,
  signalLoadingReady,
  whenLoadingScreenGone,
} from '@/loading/loadingScreen'
import type { Locale } from '@/types/resume'
import type { BallScreenGeometry } from './disco/ballProjection'
import { LANGUAGE_TAGS } from './resume/period'
import { useScreenshotViewer } from './resume/screenshotViewer'
import BackgroundSection from './BackgroundSection.vue'
import ClickSpark from './ClickSpark.vue'
import ExperienceSection from './ExperienceSection.vue'
import HeroSection from './HeroSection.vue'
import LanguageSwitcher from './LanguageSwitcher.vue'
import MusicControls from './MusicControls.vue'
import NowPlayingLabel from './NowPlayingLabel.vue'
import ProjectsSection from './ProjectsSection.vue'
import ResumeSection from './ResumeSection.vue'
import ScreenshotViewer from './ScreenshotViewer.vue'
import ScrollOrb from './ScrollOrb.vue'
import ScrollRail from './ScrollRail.vue'
import SkillsSection from './SkillsSection.vue'

const DiscoRoomBackground = defineAsyncComponent(async () => {
  const module = await import('./DiscoRoomBackground.vue')
  reportLoadingProgress(LOADING_MILESTONES.sceneChunkLoaded)
  return module
})

const route = useRoute()
const floorStage = ref<HTMLElement | null>(null)

function handleSceneProgress(value: number) {
  const { sceneChunkLoaded, sceneBuildEnd } = LOADING_MILESTONES
  reportLoadingProgress(sceneChunkLoaded + value * (sceneBuildEnd - sceneChunkLoaded))
}

/*
 * The loading screen is not a readiness signal — it leaves on a timeout whether
 * or not the room was ever built. This attribute says the room is actually
 * drawn, which is what scripts/build-share-image.ts and the end-to-end tests
 * need to wait on.
 */
function handleSceneReady(ball: BallScreenGeometry | null) {
  document.documentElement.dataset.sceneReady = 'true'
  signalLoadingReady(ball)
}

const activeLocale = computed<Locale>(() => {
  const value = Array.isArray(route.params.locale) ? route.params.locale[0] : route.params.locale
  return isLocale(value) ? value : defaultLocale
})

const resume = computed(() => resumeByLocale[activeLocale.value])

watchEffect(() => {
  document.documentElement.lang = LANGUAGE_TAGS[activeLocale.value]
  document.title = `${resume.value.profile.name} | ${resume.value.profile.title}`
})

onMounted(() => {
  void whenLoadingScreenGone().then(startMusicPlayback)
})

const player = useMusicPlayer()

/* The screenshot viewer covers the whole room, and blurs what it covers. */
const viewer = useScreenshotViewer()
</script>

<template>
  <div class="resume-page">
    <DiscoRoomBackground
      :floor-stage="floorStage"
      :sleeves="player.tracks"
      :active-sleeve-id="player.currentTrack.value?.id ?? null"
      :playing="player.isPlaying.value"
      :volume="player.volume.value"
      :labels="resume.ui"
      :read-levels="readAudioLevels"
      :covered="viewer.isOpen.value"
      @progress="handleSceneProgress"
      @ready="handleSceneReady"
      @select-sleeve="player.playTrack"
      @toggle-music="player.toggle"
      @restart-music="player.restart"
      @set-volume="player.setVolume"
    />

    <div class="resume-page__chrome">
      <NowPlayingLabel :labels="resume.ui" />
      <LanguageSwitcher :active-locale="activeLocale" />
      <MusicControls :labels="resume.ui" />
    </div>

    <ScrollOrb :labels="resume.ui" />

    <ScrollRail />

    <main class="resume-page__content">
      <HeroSection :profile="resume.profile" :labels="resume.ui" />

      <ResumeSection name="experience" :title="resume.sections.experience" :index="1">
        <ExperienceSection :items="resume.experience" :locale="activeLocale" :labels="resume.ui" />
      </ResumeSection>

      <ResumeSection name="projects" :title="resume.sections.projects" :index="2">
        <ProjectsSection :items="resume.projects" :labels="resume.ui" />
      </ResumeSection>

      <ResumeSection name="skills" :title="resume.sections.skills" :index="3">
        <SkillsSection :groups="resume.skills" :labels="resume.ui" />
      </ResumeSection>

      <ResumeSection name="background" :title="resume.sections.background" :index="4">
        <BackgroundSection
          :education="resume.education"
          :languages="resume.languages"
          :locale="activeLocale"
          :labels="resume.ui"
        />
      </ResumeSection>
    </main>

    <div ref="floorStage" class="floor-stage" aria-hidden="true"></div>

    <ScreenshotViewer :labels="resume.ui" />

    <ClickSpark />
  </div>
</template>
