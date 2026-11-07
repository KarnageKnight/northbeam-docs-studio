import { describe, expect, it } from 'vitest'
import { titleSchema } from '../../server/validation/articles'

describe('article title', () => {
  it('preserves supplied text, including surrounding whitespace', () => {
    const title = '  Getting started  '

    expect(titleSchema.parse(title)).toBe(title)
  })

  it.each(['', ' ', '\t\n', '\u2003'])('rejects blank input %j', (title) => {
    expect(titleSchema.safeParse(title).success).toBe(false)
  })

  it.each([null, undefined, 42, {}, []])('rejects non-string input %j', (title) => {
    expect(titleSchema.safeParse(title).success).toBe(false)
  })

  it.each(['a', '😀'])('accepts 200 Unicode code points made from %s', (character) => {
    const title = character.repeat(200)

    expect(titleSchema.parse(title)).toBe(title)
  })

  it.each(['a', '😀'])('rejects 201 Unicode code points made from %s', (character) => {
    expect(titleSchema.safeParse(character.repeat(201)).success).toBe(false)
  })

  it('counts surrounding spaces toward the limit', () => {
    expect(titleSchema.safeParse(` ${'a'.repeat(199)} `).success).toBe(false)
  })
})
