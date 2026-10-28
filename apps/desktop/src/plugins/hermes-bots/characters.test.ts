import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  CHARACTER_PALETTES,
  characterShape,
  characterSvg,
  HEBRI_CHARACTERS,
  paintCharacter,
  parseCharacterShape
} from './characters'

function face(shape: string) {
  const host = document.createElement('div')
  host.innerHTML = characterSvg(shape)

  return host.querySelector('svg')!
}

afterEach(() => vi.unstubAllGlobals())

describe('Hebri character artwork', () => {
  it('renders every saved design and palette without external resources or trusting unknown IDs', () => {
    for (const [, , kind] of HEBRI_CHARACTERS) {
      for (let palette = 0; palette < CHARACTER_PALETTES.length; palette++) {
        const shape = characterShape(kind, palette)
        expect(parseCharacterShape(shape)).toMatchObject({ kind, palette })
        const svg = face(shape)
        expect(svg.querySelectorAll('.hs-eye')).toHaveLength(2)
        expect(svg.querySelector('script, foreignObject, image, use')).toBeNull()
        expect(svg.querySelector('stop')?.getAttribute('stop-color')).toBe(CHARACTER_PALETTES[palette][1])
      }
    }

    for (const shape of [
      'circle',
      'blobatar:seed:cloud',
      'hebri:missing:0',
      'hebri:sage:-1',
      'hebri:sage:999',
      'hebri:sage:0:extra'
    ]) {
      expect(parseCharacterShape(shape)).toBeNull()
      expect(characterSvg(shape)).toBe('')
    }

    expect(characterSvg('hebri:sage:0', '"><script>alert(1)</script>')).not.toContain('<script>')
    expect(face('hebri:sage:0').querySelector('linearGradient')?.id).not.toBe(
      face('hebri:sage:0').querySelector('linearGradient')?.id
    )
  })

  it('moves eyes and body with activity, blinks, and stops motion for reduced-motion users', () => {
    const svg = face('hebri:prism:3')
    paintCharacter(svg, 'idle', 1)
    const idle = svg.querySelector('.hs-character')!.getAttribute('transform')
    paintCharacter(svg, 'work', 2)
    expect(svg.querySelector('.hs-character')!.getAttribute('transform')).not.toBe(idle)
    paintCharacter(svg, 'think', 4.2, { x: 2, y: -1 })
    expect(svg.querySelector('.hs-look')?.getAttribute('transform')).toBe('translate(2 -1)')
    expect(svg.querySelector<SVGElement>('.hs-eye')?.style.transform).toBe('scaleY(0.08)')
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    paintCharacter(svg, 'work', 40)
    expect(svg.querySelector('.hs-character')?.getAttribute('transform')).toBe('translate(0 0)')
    expect(svg.querySelector('.hs-look')?.getAttribute('transform')).toBe('translate(0 0)')
    expect(svg.querySelector<SVGElement>('.hs-eye')?.style.transform).toBe('scaleY(1)')
  })
})
