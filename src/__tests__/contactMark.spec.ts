import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ContactMark from '../components/ContactMark.vue'
import { resolveIcon } from '../data/resumeAssets'
import { contactKinds } from '../types/resume'

const names = [...contactKinds, 'cv', 'stack']

describe('the marks', () => {
  function maskOf(name: string) {
    return mount(ContactMark, { props: { name } }).attributes('style') ?? ''
  }

  it('has a drawing on disk for every name it is asked for', () => {
    names.forEach((name) => {
      expect(() => resolveIcon(`${name}.svg`), name).not.toThrow()
    })
  })

  it('points each name at its own drawing', () => {
    const masks = names.map(maskOf)

    masks.forEach((mask, index) => {
      expect(mask, names[index]).toContain('--mark')
    })
    expect(new Set(masks).size).toBe(names.length)
  })

  it('refuses a name with no drawing behind it', () => {
    expect(() => resolveIcon('pigeon-post.svg')).toThrow()
  })
})
