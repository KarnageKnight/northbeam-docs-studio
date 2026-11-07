import { describe, expect, it } from 'vitest'
import { renderMarkdown } from '../../shared/utils/markdown'

describe('shared Markdown rendering', () => {
  it('renders headings, emphasis, lists, code, and blockquotes', () => {
    const html = renderMarkdown('# Heading\n\n**Bold** and *italic*.\n\n- First\n- Second\n\n> A quote\n\n```js\nconst x = "<tag>"\n```')
    expect(html).toContain('<h1>Heading</h1>')
    expect(html).toContain('<strong>Bold</strong>')
    expect(html).toContain('<em>italic</em>')
    expect(html).toContain('<ul>')
    expect(html).toContain('<blockquote>')
    expect(html).toContain('&lt;tag&gt;')
  })

  it('shows raw HTML and event attributes literally', () => {
    const html = renderMarkdown('<script>alert(1)</script>\n\n<img src=x onerror="alert(1)">\n\n<b>bold</b>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('&lt;img')
    expect(html).toContain('&lt;b&gt;bold&lt;/b&gt;')
    expect(html).not.toMatch(/<(script|img|b)\b/)
  })

  it.each(['https://example.com/article', 'http://example.com', 'mailto:writer@example.com', '/articles/example', '/articles/50%25-off', './next', '../previous', 'another-article', '#heading', '?page=2'])(
    'allows approved link target %s', (url) => {
      expect(renderMarkdown(`[Read](${url})`)).toMatch(/<a href="[^"]*">Read<\/a>/)
    },
  )

  it.each(['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'java&#x73;cript:alert(1)', 'javascript&#58;alert(1)', 'javascript%3Aalert(1)', '%6Aavascript%3Aalert(1)', '%256Aavascript%253Aalert(1)', 'vbscript:msgbox(1)', 'data:text/html,test', 'file:///tmp/test', 'ftp://example.com/file', 'custom:thing', '//example.com/article', '%2f%2fexample.com', 'java%0Ascript%3Aalert(1)'])(
    'does not make unsafe or unapproved target clickable: %s', (url) => {
      expect(renderMarkdown(`[Read](${url})`)).not.toMatch(/<a\b/)
    },
  )

  it('escapes link labels and rejects unsafe image sources', () => {
    expect(renderMarkdown('[<img src=x onerror=alert(1)>](https://example.com)')).not.toContain('<img')
    expect(renderMarkdown('![image](data:image/png;base64,AAAA)')).not.toContain('<img')
  })

  it('renders empty input and repeated renders deterministically', () => {
    expect(renderMarkdown('')).toBe('')
    expect(renderMarkdown('# Same')).toBe(renderMarkdown('# Same'))
  })
})
