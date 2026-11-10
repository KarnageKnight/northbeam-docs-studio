import { describe, expect, it, vi } from 'vitest'
import { diffLines } from 'diff'
import { compareTags, compareText } from '../../app/utils/articleDiff'
import type { ArticleComparisonRequest, ArticleComparisonResponse, ComparisonLineChange } from '../../shared/types/article-comparison'
import { comparisonBoundaryFixtures, maximumComparisonTags, maximumComparisonTitle } from '../fixtures/article-comparison'

function reconstruct(rows: readonly ComparisonLineChange[], side: 'baseline' | 'target') {
  return rows.filter(row => row.kind !== (side === 'baseline' ? 'added' : 'removed'))
    .map(row => row.text).join('')
}

function expectExact(baseline: string, target: string) {
  const rows = compareText(baseline, target)
  expect(reconstruct(rows, 'baseline')).toBe(baseline)
  expect(reconstruct(rows, 'target')).toBe(target)
  for (const row of rows) expect(row.segments.map(segment => segment.text).join('')).toBe(row.text)
  return rows
}

describe('article text comparison', () => {
  it('numbers unchanged, removed, and added lines on their respective sources', () => {
    const rows = expectExact('keep\nold\nend\n', 'keep\nnew\nextra\nend\n')
    expect(rows.map(({ kind, baselineLine, targetLine }) => [kind, baselineLine, targetLine])).toEqual([
      ['unchanged', 1, 1], ['removed', 2, null], ['added', null, 2],
      ['added', null, 3], ['unchanged', 3, 4],
    ])
  })

  it.each([['', ''], ['', 'new\n'], ['old\n', ''], ['same\ntext', 'same\ntext']])(
    'handles empty and identical sources (case %#)', (baseline, target) => {
      const rows = expectExact(baseline, target)
      if (baseline === target) expect(rows.every(row => row.kind === 'unchanged')).toBe(true)
    },
  )

  it('highlights replaced words while preserving common words inside changed lines', () => {
    const rows = expectExact('Use the old workspace.\n', 'Use the new workspace.\n')
    expect(rows[0]?.segments).toEqual([
      { kind: 'unchanged', text: 'Use the ' }, { kind: 'removed', text: 'old' },
      { kind: 'unchanged', text: ' workspace.\n' },
    ])
    expect(rows[1]?.segments).toEqual([
      { kind: 'unchanged', text: 'Use the ' }, { kind: 'added', text: 'new' },
      { kind: 'unchanged', text: ' workspace.\n' },
    ])
  })

  it('aligns words across unequal replacement blocks instead of zipping unrelated lines', () => {
    const rows = expectExact('alpha old\nbeta same\n', 'alpha new beta same\nextra\n')
    expect(rows.filter(row => row.kind === 'removed').flatMap(row => row.segments)
      .filter(segment => segment.kind === 'unchanged').map(segment => segment.text).join(''))
      .toContain('beta same\n')
    expect(rows.map(row => row.text)).toEqual(['alpha old\n', 'beta same\n', 'alpha new beta same\n', 'extra\n'])
  })

  it('reverses word insertion and deletion without changing either source', () => {
    const forward = expectExact('Shared old end', 'Shared new end')
    const reverse = expectExact('Shared new end', 'Shared old end')
    expect(reverse[0]?.segments.map(s => [s.kind, s.text])).toEqual(
      forward[1]?.segments.map(s => [s.kind === 'added' ? 'removed' : s.kind, s.text]),
    )
    expect(reverse[1]?.segments.map(s => [s.kind, s.text])).toEqual(
      forward[0]?.segments.map(s => [s.kind === 'removed' ? 'added' : s.kind, s.text]),
    )
  })

  it.each([
    [' a\tb \n', 'a  b\n'], ['line\r\nnext\r\n', 'line\nnext\n'],
    ['\n\n', '\n \n\n'], ['final\n', 'final'], ['final', 'final\r\n'],
    ['\r', '\n'], ['a\rb\n', 'a\r\nb\n'], ['\t\n \n', ' \n\t\n'],
    ['😀 café e\u0301\n👩‍💻\n', '😃 cafe é\n👩‍🔬\n'], ['中文の文章\n', '中文の新文章\n'],
    ['same\nsame\nold\nsame\n', 'same\nnew\nsame\nsame\n'],
    ['a b\nc d\ne f', 'a\nb c d e\nf\n'], ['a\r\n\r\nb', 'a\n\nb\n'],
  ])('preserves exact edge-case text in both directions (case %#)', (baseline, target) => {
    for (const [before, after] of [[baseline, target], [target, baseline]]) {
      const rows = expectExact(before!, after!)
      let baselineLine = 1
      let targetLine = 1
      for (const row of rows) {
        expect(row.baselineLine).toBe(row.kind === 'added' ? null : baselineLine++)
        expect(row.targetLine).toBe(row.kind === 'removed' ? null : targetLine++)
        expect(row.text.slice(0, -1)).not.toContain('\n')
      }
      expect(compareText(before!, after!)).toEqual(rows)
    }
  })

  it('detects final-newline-only and case-only changes without normalizing content', () => {
    const rows = expectExact('Same\r\n', 'same')
    expect(rows.some(row => row.kind === 'removed')).toBe(true)
    expect(rows.some(row => row.kind === 'added')).toBe(true)
    expect(rows[0]?.segments).toContainEqual({ kind: 'removed', text: 'Same\r\n' })
  })

  it('reconstructs deterministic mixed Unicode and whitespace fixtures', () => {
    let seed = 42
    const tokens = ['a', 'b', '😀', 'e\u0301', '\t', ' ', '\r\n', '\n', '中', '\r']
    const randomText = () => Array.from({ length: 30 }, () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      return tokens[seed % tokens.length]
    }).join('')
    for (let i = 0; i < 150; i++) expectExact(randomText(), randomText())
  })

  it('preserves maximum line alignment when pruning unmatchable and repeated tokens', () => {
    let seed = 17
    const source = () => Array.from({ length: 12 }, () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      return `${String.fromCharCode(97 + (seed >>> 16) % 7)}\n`
    }).join('')
    for (let index = 0; index < 200; index++) {
      const baseline = source()
      const target = source()
      const referenceMatches = diffLines(baseline, target)
        .filter(part => !part.added && !part.removed).reduce((total, part) => total + part.count, 0)
      expect(expectExact(baseline, target).filter(row => row.kind === 'unchanged')).toHaveLength(referenceMatches)
    }
  })
})

describe('article tag comparison', () => {
  it('compares already normalized memberships independently of order and duplicates', () => {
    const baseline = Object.freeze(['guide', 'old', 'guide'])
    const target = Object.freeze(['new', 'guide', 'new'])
    expect(compareTags(baseline, target)).toEqual({ added: ['new'], removed: ['old'], unchanged: ['guide'] })
    expect(baseline).toEqual(['guide', 'old', 'guide'])
    expect(target).toEqual(['new', 'guide', 'new'])
    expect(compareTags(['a', 'b'], ['b', 'a'])).toEqual({ added: [], removed: [], unchanged: ['a', 'b'] })
  })

  it('handles empty tag sets', () => {
    expect(compareTags([], [])).toEqual({ added: [], removed: [], unchanged: [] })
    expect(compareTags([], ['guide'])).toEqual({ added: ['guide'], removed: [], unchanged: [] })
    expect(compareTags(['guide'], [])).toEqual({ added: [], removed: ['guide'], unchanged: [] })
  })
})

describe('comparison Worker protocol', () => {
  it('returns scoped complete results in both modes and safe errors without mutating captures', async () => {
    const postMessage = vi.fn<(message: ArticleComparisonResponse) => void>()
    const scope = { onmessage: null as ((event: MessageEvent<ArticleComparisonRequest>) => void) | null, postMessage }
    vi.stubGlobal('self', scope)
    try {
      await import('../../app/workers/articleDiff.worker')
      const baseline = Object.freeze({
        kind: 'version' as const, articleId: 'article-uuid', versionId: 'version-uuid',
        versionNumber: 1, label: 'Version 1', title: 'Old title', body: 'Old body\n', tags: Object.freeze(['old']),
      })
      const target = Object.freeze({
        kind: 'saved-draft' as const, articleId: 'article-uuid', revision: 7,
        label: 'Saved draft' as const, title: 'New title', body: 'New body\n', tags: Object.freeze(['new']),
      })
      const request: ArticleComparisonRequest = { type: 'compare', articleId: baseline.articleId, requestId: 12,
        mode: 'draft-version', baseline, target }
      const dispatch = (data: ArticleComparisonRequest) => scope.onmessage!({ data } as MessageEvent<ArticleComparisonRequest>)
      dispatch(request)
      const response = postMessage.mock.calls[0]![0]
      expect(response).toMatchObject({ type: 'result', requestId: 12, articleId: baseline.articleId,
        result: { requestId: 12, articleId: baseline.articleId, identical: false, mode: 'draft-version',
          target: { label: 'Saved draft', revision: 7 }, tags: { added: ['new'], removed: ['old'] } } })
      if (response.type !== 'result') throw new Error('Expected a complete result')
      expect(reconstruct(response.result.title, 'target')).toBe(target.title)
      expect(reconstruct(response.result.body, 'baseline')).toBe(baseline.body)
      expect(response.result.baseline).not.toHaveProperty('body')
      expect(response.result.target).not.toHaveProperty('tags')
      dispatch({ ...request, requestId: 13, mode: 'version-version', target: baseline })
      expect(postMessage.mock.calls[1]![0]).toMatchObject({ type: 'result', requestId: 13,
        result: { mode: 'version-version', identical: true } })
      dispatch({ ...request, requestId: 14, target: { ...target, articleId: 'another-article' } })
      expect(postMessage.mock.calls[2]![0]).toEqual({ type: 'error', requestId: 14,
        articleId: baseline.articleId, code: 'comparison-failed', message: 'We could not compare these sources. Please try again.' })
      expect(target.body).toBe('New body\n')
      expect(baseline.tags).toEqual(['old'])
    }
    finally { vi.unstubAllGlobals() }
  })
})

describe('comparison boundary fixtures', () => {
  it('provides maximum-size titles, bodies, and tags for every browser fixture', () => {
    expect(Array.from(maximumComparisonTitle)).toHaveLength(200)
    expect(maximumComparisonTags).toHaveLength(10)
    expect(maximumComparisonTags.every(tag => Array.from(tag).length === 30)).toBe(true)
    for (const fixture of comparisonBoundaryFixtures) {
      expect(Array.from(fixture.baseline), fixture.name).toHaveLength(100000)
      expect(Array.from(fixture.target), fixture.name).toHaveLength(100000)
    }
  })

  it.each(comparisonBoundaryFixtures)(
    'reconstructs the full $name fixture', ({ baseline, target }) => {
      expectExact(baseline, target)
    },
    30000,
  )
})
