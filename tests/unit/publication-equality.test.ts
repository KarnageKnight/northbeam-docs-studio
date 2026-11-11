import { describe, expect, it } from 'vitest'
import { samePublicationContent } from '../../server/services/articles/samePublicationContent'

const content = { title: ' Title ', body: '**Café**\n', tags: ['ideas', 'writing'] }

describe('saved publication equality', () => {
  it.each([
    { ...content },
    { ...content, tags: ['writing', 'ideas'] },
  ])('compares identical content and reordered tags symmetrically', (other) => {
    const before = structuredClone([content, other])
    expect(samePublicationContent(content, other)).toBe(true)
    expect(samePublicationContent(other, content)).toBe(true)
    expect([content, other]).toEqual(before)
  })

  it.each([
    { ...content, title: 'Title' },
    { ...content, body: '**Café**' },
    { ...content, body: '**Cafe\u0301**\n' },
    { ...content, body: '__Café__\n' },
    { ...content, body: '**Café** \n' },
    { ...content, tags: ['ideas'] },
    { ...content, tags: ['ideas', 'other'] },
  ])('preserves exact text and tag membership distinctions', (other) => {
    expect(samePublicationContent(content, other)).toBe(false)
    expect(samePublicationContent(other, content)).toBe(false)
  })

  it('handles empty tags and maximum accepted content without mutation', () => {
    expect(samePublicationContent({ ...content, tags: [] }, { ...content, tags: [] })).toBe(true)
    const maximum = { title: '😀'.repeat(200), body: '😀'.repeat(100_000), tags: Array.from({ length: 10 }, (_, i) => `${i}${'a'.repeat(29)}`) }
    expect(samePublicationContent(maximum, { ...maximum, tags: [...maximum.tags].reverse() })).toBe(true)
    expect(samePublicationContent(maximum, { ...maximum, body: `${maximum.body.slice(0, -2)}x` })).toBe(false)
  })
})
