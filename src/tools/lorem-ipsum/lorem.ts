const WORDS = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit', 'sed', 'do',
  'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore', 'magna', 'aliqua', 'enim',
  'ad', 'minim', 'veniam', 'quis', 'nostrud', 'exercitation', 'ullamco', 'laboris', 'nisi',
  'aliquip', 'ex', 'ea', 'commodo', 'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit',
  'voluptate', 'velit', 'esse', 'cillum', 'eu', 'fugiat', 'nulla', 'pariatur', 'excepteur',
  'sint', 'occaecat', 'cupidatat', 'non', 'proident', 'sunt', 'culpa', 'qui', 'officia',
  'deserunt', 'mollit', 'anim', 'id', 'est', 'laborum',
]

const OPENER = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'
const OPENER_WORDS = ['lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit']

export function clampCount(n: number): number {
  if (!Number.isFinite(n)) return 1
  return Math.min(Math.max(Math.trunc(n), 1), 50)
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomWords(n: number): string[] {
  return Array.from({ length: n }, () => pick(WORDS))
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function buildSentence(wordCount: number): string {
  const words = randomWords(wordCount)
  if (wordCount > 6) {
    const commaPos = 2 + Math.floor(Math.random() * (wordCount - 5))
    words[commaPos] += ','
  }
  return capitalize(words.join(' ')) + '.'
}

function randomSentence(): string {
  return buildSentence(6 + Math.floor(Math.random() * 9))
}

function randomParagraph(): string {
  const sentenceCount = 3 + Math.floor(Math.random() * 5)
  return Array.from({ length: sentenceCount }, randomSentence).join(' ')
}

export type LoremUnit = 'paragraphs' | 'sentences' | 'words'

export function generateLorem(unit: LoremUnit, count: number, startWithLorem: boolean): string {
  const n = clampCount(count)

  if (unit === 'words') {
    const words =
      startWithLorem && n <= OPENER_WORDS.length
        ? OPENER_WORDS.slice(0, n)
        : startWithLorem
          ? [...OPENER_WORDS, ...randomWords(n - OPENER_WORDS.length)]
          : randomWords(n)
    return capitalize(words.join(' ')) + '.'
  }

  if (unit === 'sentences') {
    const sentences = Array.from({ length: n }, (_, i) =>
      i === 0 && startWithLorem ? OPENER : randomSentence(),
    )
    return sentences.join(' ')
  }

  const paragraphs = Array.from({ length: n }, (_, i) => {
    if (i === 0 && startWithLorem) {
      const extra = Array.from({ length: 2 + Math.floor(Math.random() * 4) }, randomSentence)
      return [OPENER, ...extra].join(' ')
    }
    return randomParagraph()
  })
  return paragraphs.join('\n\n')
}
