import { describe, expect, it, vi } from 'vitest'
import { generateCharacterNames } from '../nameGenerator'

describe('generateCharacterNames', () => {
  it('generates themed names for a race, class, and tone', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.9)  // prefix index -> last
      .mockReturnValueOnce(0.9)  // raceWord index -> last
      .mockReturnValueOnce(0.9)  // classWord index -> last
      .mockReturnValueOnce(0.9)  // suffix index -> last
      .mockReturnValueOnce(0.1)  // pattern -> 0

    const names = generateCharacterNames({
      race: 'Elf',
      characterClass: 'Wizard',
      tone: 'mysterious',
      count: 1,
    })

    expect(names).toHaveLength(1)
    // mysterious prefixes: ["Vael","Nyx","Raven","Orin","Sable"] -> Sable
    // Elf raceWords: ["moon","silver","leaf","star","thorn"] -> thorn
    // suffix: last -> "wind"
    // pattern 0: "{prefix} {RaceWord}{Suffix}"
    expect(names[0]).toBe('Sable ThornForge')
  })

  it('returns unique names up to the requested count', () => {
    // Use a fixed seed approach: mock Math.random to return values that
    // produce different names on each iteration
    const randomSequence = [
      0.0, 0.0, 0.0, 0.0, 0.0,  // iter 1: Sir, stone, blade, bright, pattern=0
      0.2, 0.2, 0.2, 0.2, 0.25, // iter 2: Lady, iron, shield, briar, pattern=0
      0.4, 0.4, 0.4, 0.4, 0.5,  // iter 3: Captain, deep, valor, storm, pattern=0
      0.6, 0.6, 0.6, 0.6, 0.75, // iter 4: Champion, forge, steel, vale, pattern=0
      0.8, 0.8, 0.8, 0.8, 0.9,  // iter 5: Keeper, amber, warden, heart, pattern=0
    ]
    let idx = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      const val = randomSequence[idx % randomSequence.length]
      idx += 1
      return val
    })

    const names = generateCharacterNames({
      race: 'Dwarf',
      characterClass: 'Fighter',
      tone: 'heroic',
      count: 5,
    })

    expect(names).toHaveLength(5)
    expect(new Set(names).size).toBe(5)
  })

  it('falls back to generic fantasy words for unknown race and class', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.0)  // prefix -> Sir
      .mockReturnValueOnce(0.0)  // raceWord -> bright (fallback)
      .mockReturnValueOnce(0.0)  // classWord -> quest (fallback)
      .mockReturnValueOnce(0.0)  // suffix -> bright
      .mockReturnValueOnce(0.1)  // pattern -> 0

    const names = generateCharacterNames({
      race: 'Aasimar',
      characterClass: 'Artificer',
      tone: 'heroic',
      count: 1,
    })

    expect(names).toHaveLength(1)
    // heroic prefixes: ["Sir","Lady","Captain","Champion","Keeper"] -> Sir
    // fallback raceWords: ["bright","brave"] -> bright
    // fallback classWords: ["quest","hero"] -> quest
    // suffix: bright
    // pattern 0: "{prefix} {RaceWord}{Suffix}"
    expect(names[0]).toBe('Sir BrightBright')
  })

  it('falls back to heroic tone for unknown tone', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.0)
      .mockReturnValueOnce(0.0)
      .mockReturnValueOnce(0.0)
      .mockReturnValueOnce(0.0)
      .mockReturnValueOnce(0.1)

    const names = generateCharacterNames({
      race: 'Human',
      characterClass: 'Fighter',
      tone: 'unknown-tone' as any,
      count: 1,
    })

    expect(names).toHaveLength(1)
    // Should use heroic prefix "Sir" as fallback
    expect(names[0]).toMatch(/^Sir /)
  })
})
