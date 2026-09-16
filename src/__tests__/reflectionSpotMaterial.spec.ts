import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import {
  REFLECTION_SPOT_FRAGMENT_SHADER,
  REFLECTION_SPOT_SHAPE_ATTRIBUTE,
  REFLECTION_SPOT_VERTEX_SHADER,
  createReflectionSpotMaterial,
} from '../components/disco/reflectionSpotMaterial'

const desktopOptions = { haloReach: 1.3, lowQuality: false }

describe('reflection spot material', () => {
  it('keeps the premultiplied, depth safe setup the batch relies on', () => {
    const material = createReflectionSpotMaterial(desktopOptions)

    expect(material.blending).toBe(THREE.CustomBlending)
    expect(material.blendSrc).toBe(THREE.OneFactor)
    expect(material.blendDst).toBe(THREE.OneMinusSrcAlphaFactor)
    expect(material.blendSrcAlpha).toBe(THREE.OneFactor)
    expect(material.blendDstAlpha).toBe(THREE.OneMinusSrcAlphaFactor)
    expect(material.premultipliedAlpha).toBe(true)
    expect(material.transparent).toBe(true)
    expect(material.depthTest).toBe(true)
    expect(material.depthWrite).toBe(false)
    expect(material.side).toBe(THREE.DoubleSide)
    expect(material.vertexColors).toBe(true)
  })

  it('writes a coverage alpha once the displayed colour is final', () => {
    const colorSpace = REFLECTION_SPOT_FRAGMENT_SHADER.indexOf('#include <colorspace_fragment>')
    const alpha = REFLECTION_SPOT_FRAGMENT_SHADER.search(/gl_FragColor\.a\s*=/)

    expect(alpha).toBeGreaterThan(colorSpace)
    expect(REFLECTION_SPOT_FRAGMENT_SHADER).not.toMatch(
      /gl_FragColor\s*=\s*vec4\([^)]*,\s*0\.0\s*\)/,
    )
  })

  it('stays tone mapped so the spots match the scene exposure', () => {
    expect(createReflectionSpotMaterial(desktopOptions).toneMapped).toBe(true)
  })

  it('leaves three dithering off', () => {
    expect(createReflectionSpotMaterial(desktopOptions).dithering).toBe(false)
  })

  it('publishes the halo reach the footprint padding was built with', () => {
    const material = createReflectionSpotMaterial({ haloReach: 0.7, lowQuality: false })

    expect(material.uniforms.uHaloReach?.value).toBe(0.7)
  })

  it('declares every uniform the fragment shader reads', () => {
    const material = createReflectionSpotMaterial(desktopOptions)
    const declared = [
      ...REFLECTION_SPOT_FRAGMENT_SHADER.matchAll(/uniform\s+\w+\s+(u\w+)\s*;/g),
    ].map((match) => match[1]!)

    expect(declared.length).toBeGreaterThan(0)
    declared.forEach((name) => {
      expect(material.uniforms).toHaveProperty(name)
      expect(material.uniforms[name]?.value).toBeDefined()
    })
  })

  it('tone maps and then encodes, after the fragment colour is assigned', () => {
    const assignment = REFLECTION_SPOT_FRAGMENT_SHADER.indexOf('gl_FragColor = vec4(')
    const toneMapping = REFLECTION_SPOT_FRAGMENT_SHADER.indexOf('#include <tonemapping_fragment>')
    const colorSpace = REFLECTION_SPOT_FRAGMENT_SHADER.indexOf('#include <colorspace_fragment>')

    expect(assignment).toBeGreaterThan(-1)
    expect(assignment).toBeLessThan(toneMapping)
    expect(toneMapping).toBeLessThan(colorSpace)
  })

  it('declares the per spot shape attribute in the vertex shader', () => {
    expect(REFLECTION_SPOT_VERTEX_SHADER).toContain(
      `attribute vec4 ${REFLECTION_SPOT_SHAPE_ATTRIBUTE};`,
    )
  })

  it('does not redeclare the attributes three already provides', () => {
    expect(REFLECTION_SPOT_VERTEX_SHADER).not.toMatch(/attribute\s+vec2\s+uv\s*;/)
    expect(REFLECTION_SPOT_VERTEX_SHADER).not.toMatch(/attribute\s+vec3\s+(position|color)\s*;/)
  })

  it('reads vColor as the vec4 three declares in this version', () => {
    expect(REFLECTION_SPOT_FRAGMENT_SHADER).toContain('vColor.rgb')
    expect(REFLECTION_SPOT_FRAGMENT_SHADER).not.toMatch(/\bvColor\s*[;*)]/)
  })

  it('drops the costly optical terms on the low quality tier', () => {
    const low = createReflectionSpotMaterial({ haloReach: 1, lowQuality: true })
    const high = createReflectionSpotMaterial(desktopOptions)

    expect(low.defines).toHaveProperty('SPOT_QUALITY_LOW')
    expect(high.defines).not.toHaveProperty('SPOT_QUALITY_LOW')
  })
})
