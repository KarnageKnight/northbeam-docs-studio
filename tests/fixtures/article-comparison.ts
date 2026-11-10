function fullBody(pattern: string): string {
  const length = Array.from(pattern).length
  return Array.from(pattern.repeat(Math.ceil(100000 / length))).slice(0, 100000).join('')
}

const shared = fullBody('shared words\n')

export const comparisonBoundaryFixtures = [
  { name: 'identical', baseline: shared, target: shared },
  { name: 'sparse', baseline: shared, target: `edited${shared.slice(6, -6)}ending` },
  { name: 'long-single-line', baseline: 'a'.repeat(100000), target: 'b'.repeat(100000) },
  { name: 'repeated-lines', baseline: fullBody('repeat\nsame\n'), target: fullBody('same\nrepeat\n') },
  { name: 'many-short-lines', baseline: fullBody('a\n'), target: fullBody('b\n') },
  { name: 'unequal-replacements', baseline: fullBody('alpha old\nbeta shared\n'), target: fullBody('alpha new beta shared\nextra\n') },
  { name: 'unicode', baseline: fullBody('😀 e\u0301 👩‍💻\r\n'), target: fullBody('😃 é 👩‍🔬\n') },
  { name: 'whitespace', baseline: fullBody('a \t\r\n\n'), target: fullBody('a\t \n \n') },
  { name: 'different-token-dense', baseline: fullBody('a '), target: fullBody('b!') },
] as const

export const maximumComparisonTitle = '😀'.repeat(200)
export const maximumComparisonTags = Array.from({ length: 10 }, (_, index) => `${index}${'a'.repeat(29)}`)
