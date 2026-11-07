import MarkdownIt from 'markdown-it'

const markdown = new MarkdownIt({ html: false, linkify: false, typographer: false })

markdown.validateLink = (url: string) => {
  let decoded = url
  for (let attempt = 0; attempt < 5; attempt++) {
    let next: string
    try { next = decodeURIComponent(decoded) }
    catch { break }
    if (next === decoded) break
    decoded = next
    if (attempt === 4) return false
  }
  const target = decoded.replace(/[\u0000-\u0020\u007f-\u009f]/g, '').replace(/\\/g, '/')
  if (target.startsWith('//')) return false
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(target)
  return !scheme || /^(https?|mailto)$/i.test(scheme[1] ?? '')
}

export function renderMarkdown(source: string) {
  return markdown.render(source)
}
