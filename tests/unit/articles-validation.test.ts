import { describe, expect, it } from 'vitest'
import { createArticleSchema, titleSchema } from '../../server/validation/articles'

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

describe('article creation', () => {
  const valid = { title: '  Finding inspiration  ', slug: ' My-Article ' }

  it.each([{}, { body: null, tags: null }])('normalizes creation defaults %j', (optional) => {
    expect(createArticleSchema.parse({ ...valid, ...optional })).toEqual({
      title: valid.title, slug: 'my-article', body: '', tags: [],
    })
  })

  it('preserves body text and normalizes tags in first-occurrence order', () => {
    expect(createArticleSchema.parse({ ...valid, body: '  # Text\n', tags: [' API ', '', 'guide', 'api', ' GUIDE ', '  '] }))
      .toMatchObject({ body: '  # Text\n', tags: ['api', 'guide'] })
  })

  it.each(['', 'two words', '-slug', 'slug-', 'two--words', 'a_b', 'café', 'x'.repeat(101)])(
    'rejects invalid slug %j', (slug) => {
      expect(createArticleSchema.safeParse({ ...valid, slug }).success).toBe(false)
    },
  )

  it('accepts exact slug/body/tag limits after normalization', () => {
    const tags = Array.from({ length: 10 }, (_, i) => `${i}${'a'.repeat(29)}`)
    expect(createArticleSchema.parse({ ...valid, slug: 'a'.repeat(100), body: '😀'.repeat(100000), tags }).tags).toEqual(tags)
    expect(createArticleSchema.parse({ ...valid, tags: [...tags, ...tags, ' '] }).tags).toEqual(tags)
  })

  it.each([
    { title: '' }, { title: 1 }, { slug: null }, { body: 1 }, { body: '😀'.repeat(100001) },
    { tags: 'tag' }, { tags: [1] }, { tags: [null] }, { tags: ['a b'] }, { tags: ['café'] },
    { tags: ['a--b'] }, { tags: ['a'.repeat(31)] }, { tags: Array.from({ length: 11 }, (_, i) => `tag-${i}`) },
    { unexpected: true }, { revision: 3 },
  ])('rejects invalid creation fields (case %#)', (fields) => {
    expect(createArticleSchema.safeParse({ ...valid, ...fields }).success).toBe(false)
  })

  it.each([null, [], 'text', {}, { title: 'Title' }, { slug: 'slug' }])('rejects invalid input %j', (input) => {
    expect(createArticleSchema.safeParse(input).success).toBe(false)
  })
})
