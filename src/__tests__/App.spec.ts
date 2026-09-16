import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'

import App from '../App.vue'
import ResumePage from '../components/ResumePage.vue'

vi.mock('../audio/musicPlayer', async () => {
  const { ref } = await import('vue')

  return {
    startMusicPlayback: vi.fn<() => void>(),
    useMusicPlayer: () => ({
      currentTrack: ref(null),
      isPlaying: ref(false),
      isBlocked: ref(false),
      isEnabled: ref(true),
      volume: ref(0.5),
      elapsed: ref(0),
      start: vi.fn<() => void>(),
      toggle: vi.fn<() => void>(),
      next: vi.fn<() => void>(),
      restart: vi.fn<() => void>(),
      playTrack: vi.fn<(id: string) => void>(),
      setVolume: vi.fn<(value: number) => void>(),
      destroy: vi.fn<() => void>(),
    }),
  }
})

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', redirect: '/en' },
      { path: '/:locale', name: 'resume', component: ResumePage },
    ],
  })
}

describe('App', () => {
  it('renders the localized resume shell', async () => {
    const router = createTestRouter()
    router.push('/en')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [router],
      },
    })

    expect(wrapper.text()).toContain('Babii Oleksandr')
    expect(wrapper.text()).toContain('Work Experience')
    expect(wrapper.text()).toContain('Pet Projects')
    expect(wrapper.find('.floor-stage').exists()).toBe(true)
  })

  it('renders every section, numbered by its place on the page', () => {
    const router = createTestRouter()
    router.push('/en')

    return router.isReady().then(() => {
      const wrapper = mount(App, { global: { plugins: [router] } })
      const sections = wrapper.findAll('.resume-section')

      expect(sections.map((section) => section.find('h2').text())).toEqual([
        'Work Experience',
        'Pet Projects',
        'Skills',
        'Education and Languages',
      ])

      expect(sections.map((section) => section.find('.section-kicker').text())).toEqual([
        '01',
        '02',
        '03',
        '04',
      ])
    })
  })

  it('shows a job with its dates written out and its projects under it', () => {
    const router = createTestRouter()
    router.push('/en')

    return router.isReady().then(() => {
      const wrapper = mount(App, { global: { plugins: [router] } })
      const text = wrapper.text()

      expect(text).toContain('April 2026')
      expect(text).toContain('present')
      expect(text).toContain('ZODA Memorial')
      expect(wrapper.findAll('.experience-timeline__row').length).toBeGreaterThan(0)
    })
  })

  it('names every tile in the hero by what pressing it does', () => {
    const router = createTestRouter()
    router.push('/en')

    return router.isReady().then(() => {
      const wrapper = mount(App, { global: { plugins: [router] } })
      const tiles = wrapper.findAll('.hero-section__links .contact-avatar')

      expect(tiles).toHaveLength(5)
      expect(tiles.map((link) => link.attributes('aria-label'))).toEqual([
        'Open GitHub',
        'Message on Telegram',
        'Message on WhatsApp',
        'Send an email',
        'Download resume (PDF)',
      ])
      expect(tiles.map((link) => link.text())).toEqual([
        'Open GitHub',
        'Message on Telegram',
        'Message on WhatsApp',
        'Send an email',
        'Download resume (PDF)',
      ])
      expect(wrapper.find('.hero-section__portrait').exists()).toBe(false)
    })
  })

  it('gives the address and the resume tiles without photographs', () => {
    const router = createTestRouter()
    router.push('/en')

    return router.isReady().then(() => {
      const wrapper = mount(App, { global: { plugins: [router] } })
      const faceless = wrapper.findAll('.hero-section__links .contact-avatar--markonly')

      expect(faceless).toHaveLength(2)
      faceless.forEach((tile) => {
        expect(tile.find('img').exists()).toBe(false)
        expect(tile.find('.contact-avatar__badge .contact-mark').exists()).toBe(true)
      })

      const email = wrapper.get('a[href^="mailto:"]')
      expect(email.attributes('href')).toBe('mailto:regularguy835@gmail.com')

      const resume = wrapper.get('.contact-avatar--resume')
      expect(resume.attributes('download')).toBe('Babii-Oleksandr-resume-en.pdf')
      expect(resume.attributes('target')).toBeUndefined()
      expect(email.attributes('target')).toBeUndefined()
    })
  })

  it('keeps exactly one h1, which several e2e specs navigate by', () => {
    const router = createTestRouter()
    router.push('/en')

    return router.isReady().then(() => {
      const wrapper = mount(App, { global: { plugins: [router] } })

      expect(wrapper.findAll('h1')).toHaveLength(1)
    })
  })
})
