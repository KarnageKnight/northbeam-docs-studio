import { diffArrays, diffLines, diffWordsWithSpace } from 'diff'
import type { ArticleComparisonRequest, ArticleComparisonResult, ComparisonInlineSegment, ComparisonLineChange,
  ComparisonTagDelta, VersionSource } from '../../shared/types/article-comparison'

function exactChanges(baseline: string, target: string, tokenize: (text: string) => string[]): ComparisonInlineSegment[] {
  if (baseline === target) return baseline ? [{ kind: 'unchanged', text: baseline }] : []
  if (!baseline || !target) return [{ kind: baseline ? 'removed' : 'added', text: baseline || target }]
  const before = tokenize(baseline)
  const after = tokenize(target)
  const beforeSet = new Set(before)
  const afterSet = new Set(after)
  const oldCommon = before.map((text, index) => ({ text, index })).filter(token => afterSet.has(token.text))
  const newCommon = after.map((text, index) => ({ text, index })).filter(token => beforeSet.has(token.text))
  const subsequence = (shorter: typeof oldCommon, longer: typeof newCommon) => {
    const matches: [number, number][] = []
    let next = 0
    for (let index = 0; index < longer.length && next < shorter.length; index++) {
      if (shorter[next]!.text === longer[index]!.text) matches.push([next++, index])
    }
    return next === shorter.length ? matches : null
  }
  let matches = oldCommon.length <= newCommon.length ? subsequence(oldCommon, newCommon) : null
  if (!matches && newCommon.length <= oldCommon.length) {
    matches = subsequence(newCommon, oldCommon)?.map(([newIndex, oldIndex]) => [oldIndex, newIndex]) ?? null
  }
  if (!matches) {
    matches = []
    let oldIndex = 0
    let newIndex = 0
    for (const change of diffArrays(oldCommon, newCommon, { comparator: (a, b) => a.text === b.text })) {
      if (change.removed) oldIndex += change.count
      else if (change.added) newIndex += change.count
      else for (let count = 0; count < change.count; count++) matches.push([oldIndex++, newIndex++])
    }
  }
  const changes: ComparisonInlineSegment[] = []
  const append = (kind: ComparisonInlineSegment['kind'], text: string) => {
    if (!text) return
    const previous = changes.at(-1)
    if (previous?.kind === kind) changes[changes.length - 1] = { kind, text: previous.text + text }
    else changes.push({ kind, text })
  }
  let oldIndex = 0
  let newIndex = 0
  // Unmatchable tokens bypass only the search; original-index gaps preserve every character.
  for (const [oldMatch, newMatch] of matches) {
    const oldToken = oldCommon[oldMatch]!
    const newToken = newCommon[newMatch]!
    append('removed', before.slice(oldIndex, oldToken.index).join(''))
    append('added', after.slice(newIndex, newToken.index).join(''))
    append('unchanged', oldToken.text)
    oldIndex = oldToken.index + 1
    newIndex = newToken.index + 1
  }
  append('removed', before.slice(oldIndex).join(''))
  append('added', after.slice(newIndex).join(''))
  return changes
}

function segmentRows(segments: readonly ComparisonInlineSegment[]) {
  const rows: { text: string; segments: ComparisonInlineSegment[] }[] = []
  let row = { text: '', segments: [] as ComparisonInlineSegment[] }
  for (const segment of segments) {
    for (const text of segment.text.match(/[^\n]*\n|[^\n]+$/g) ?? []) {
      row.text += text
      const previous = row.segments.at(-1)
      if (previous?.kind === segment.kind) {
        row.segments[row.segments.length - 1] = { kind: segment.kind, text: previous.text + text }
      }
      else row.segments.push({ kind: segment.kind, text })
      if (text.endsWith('\n')) {
        rows.push(row)
        row = { text: '', segments: [] }
      }
    }
  }
  if (row.text) rows.push(row)
  return rows
}

export function compareText(baseline: string, target: string): ComparisonLineChange[] {
  const rows: ComparisonLineChange[] = []
  let baselineLine = 1
  let targetLine = 1
  const changes = exactChanges(baseline, target, text => diffLines('', text, {
    ignoreWhitespace: false,
    ignoreNewlineAtEof: false,
    stripTrailingCr: false,
    newlineIsToken: false,
    oneChangePerToken: true,
  }).map(change => change.value))
  for (let index = 0; index < changes.length;) {
    const change = changes[index]!
    if (change.kind === 'unchanged') {
      for (const row of segmentRows([{ kind: 'unchanged', text: change.text }])) {
        rows.push({ ...row, kind: 'unchanged', baselineLine: baselineLine++, targetLine: targetLine++ })
      }
      index++
      continue
    }
    const removed: string[] = []
    const added: string[] = []
    while (index < changes.length && changes[index]!.kind !== 'unchanged') {
      const next = changes[index++]!
      if (next.kind === 'removed') removed.push(next.text)
      else added.push(next.text)
    }
    const before = removed.join('')
    const after = added.join('')
    // Align whole replacement blocks before projecting back to each source's lines.
    const words: ComparisonInlineSegment[] = before && after
      ? exactChanges(before, after, text => diffWordsWithSpace('', text, {
          ignoreCase: false, oneChangePerToken: true,
        }).map(change => change.value))
      : [{ kind: before ? 'removed' : 'added', text: before || after }]
    for (const row of segmentRows(words.filter(part => part.kind !== 'added'))) {
      rows.push({ ...row, kind: 'removed', baselineLine: baselineLine++, targetLine: null })
    }
    for (const row of segmentRows(words.filter(part => part.kind !== 'removed'))) {
      rows.push({ ...row, kind: 'added', baselineLine: null, targetLine: targetLine++ })
    }
  }
  return rows
}

export function compareTags(baseline: readonly string[], target: readonly string[]): ComparisonTagDelta {
  const before = new Set(baseline)
  const after = new Set(target)
  return {
    added: [...after].filter(tag => !before.has(tag)),
    removed: [...before].filter(tag => !after.has(tag)),
    unchanged: [...before].filter(tag => after.has(tag)),
  }
}

export function compareArticle(request: ArticleComparisonRequest): ArticleComparisonResult {
  if (request.baseline.articleId !== request.articleId || request.target.articleId !== request.articleId) {
    throw new Error('Comparison sources must belong to the requested article.')
  }
  const title = compareText(request.baseline.title, request.target.title)
  const body = compareText(request.baseline.body, request.target.body)
  const tags = compareTags(request.baseline.tags, request.target.tags)
  const common = {
    requestId: request.requestId, articleId: request.articleId, title, body, tags,
    identical: title.every(row => row.kind === 'unchanged') && body.every(row => row.kind === 'unchanged')
      && tags.added.length === 0 && tags.removed.length === 0,
  }
  const baseline: VersionSource = {
    kind: 'version', articleId: request.articleId, versionId: request.baseline.versionId,
    versionNumber: request.baseline.versionNumber, label: request.baseline.label,
  }
  if (request.mode === 'draft-version') {
    return { ...common, mode: request.mode, baseline, target: {
      kind: 'saved-draft', articleId: request.articleId, revision: request.target.revision, label: 'Saved draft',
    } }
  }
  return { ...common, mode: request.mode, baseline, target: {
    kind: 'version', articleId: request.articleId, versionId: request.target.versionId,
    versionNumber: request.target.versionNumber, label: request.target.label,
  } }
}
