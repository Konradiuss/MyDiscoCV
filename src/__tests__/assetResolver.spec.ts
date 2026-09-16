import { describe, expect, it } from 'vitest'

import { createAssetResolver } from '../lib/assetResolver'

const urls = {
  '../assets/avatars/github.svg': '/assets/github.a1b2c3.svg',
  '../assets/avatars/telegram.svg': '/assets/telegram.d4e5f6.svg',
}

describe('finding a named file', () => {
  it('resolves a name to the URL the bundler emitted', () => {
    const resolve = createAssetResolver(urls, 'src/assets/avatars')

    expect(resolve('telegram.svg')).toBe('/assets/telegram.d4e5f6.svg')
  })

  it('finds a file whose extension changed since the content was written', () => {
    const replaced = { '../assets/avatars/github.png': '/assets/github.9z8y7x.png' }
    const resolve = createAssetResolver(replaced, 'src/assets/avatars')

    expect(resolve('github.svg')).toBe('/assets/github.9z8y7x.png')
  })

  it('prefers the file that was actually named', () => {
    const both = {
      '../assets/avatars/github.svg': '/assets/github.svg',
      '../assets/avatars/github.png': '/assets/github.png',
    }
    const resolve = createAssetResolver(both, 'src/assets/avatars')

    expect(resolve('github.png')).toBe('/assets/github.png')
    expect(resolve('github.svg')).toBe('/assets/github.svg')
  })

  it('names both files when the stem alone cannot decide', () => {
    const both = {
      '../assets/avatars/github.svg': '/assets/github.svg',
      '../assets/avatars/github.png': '/assets/github.png',
    }
    const resolve = createAssetResolver(both, 'src/assets/avatars')

    expect(() => resolve('github.webp')).toThrow(/github\.png, github\.svg/)
  })

  it('names the available files when there is no match at all', () => {
    const resolve = createAssetResolver(urls, 'src/assets/avatars')

    expect(() => resolve('missing.svg')).toThrow(/github\.svg, telegram\.svg/)
  })

  it('says the folder is empty rather than listing nothing', () => {
    const resolve = createAssetResolver({})

    expect(() => resolve('anything.png')).toThrow(/folder is empty/)
  })

  it('does not treat a leading dot as an extension', () => {
    const resolve = createAssetResolver({ '../assets/x/.keep': '/assets/.keep' }, 'src/assets/x')

    expect(resolve('.keep')).toBe('/assets/.keep')
  })
})
