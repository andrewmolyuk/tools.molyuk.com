/**
 * Case conversion, built on one step that everything else reuses: split the input into
 * words. Getting that split right is the whole problem — "parseHTTPResponse" has to
 * become [parse, HTTP, Response], not [parse, H, T, T, P, Response].
 */

/**
 * Splits on separators and on case boundaries. The acronym rule is the subtle one:
 * in a run of capitals followed by a lowercase letter, the last capital starts the
 * next word ("HTTPServer" → HTTP + Server).
 */
export function splitWords(input: string): string[] {
  return input
    .replace(/[_\-.\s/\\:]+/g, ' ')
    // digit/letter boundaries both ways: "utf8Value" → "utf 8 Value", "v2Api" → "v 2 Api"
    .replace(/([a-zA-Z])(\d)/g, '$1 $2')
    .replace(/(\d)([a-zA-Z])/g, '$1 $2')
    // end of an acronym run: "HTTPServer" → "HTTP Server"
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    // ordinary camel boundary: "camelCase" → "camel Case"
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ')
    .filter(Boolean)
}

const lower = (words: string[]) => words.map((w) => w.toLowerCase())
const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()

/** Short words stay lowercase in title case unless they open or close the string. */
const MINOR_WORDS = new Set([
  'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'if', 'in',
  'nor', 'of', 'on', 'or', 'per', 'the', 'to', 'v', 'via', 'vs',
])

export interface CaseStyle {
  key: string
  convert: (words: string[]) => string
}

export const CASE_STYLES: CaseStyle[] = [
  { key: 'camel', convert: (w) => lower(w).map((x, i) => (i ? capitalize(x) : x)).join('') },
  { key: 'pascal', convert: (w) => w.map(capitalize).join('') },
  { key: 'snake', convert: (w) => lower(w).join('_') },
  { key: 'screamingSnake', convert: (w) => w.map((x) => x.toUpperCase()).join('_') },
  { key: 'kebab', convert: (w) => lower(w).join('-') },
  { key: 'train', convert: (w) => w.map(capitalize).join('-') },
  { key: 'dot', convert: (w) => lower(w).join('.') },
  { key: 'path', convert: (w) => lower(w).join('/') },
  { key: 'constant', convert: (w) => w.map((x) => x.toUpperCase()).join('') },
  {
    key: 'sentence',
    convert: (w) => {
      const words = lower(w)
      return words.length ? capitalize(words[0]) + (words.length > 1 ? ' ' + words.slice(1).join(' ') : '') : ''
    },
  },
  {
    key: 'title',
    convert: (w) => {
      const words = lower(w)
      return words
        .map((word, i) =>
          i !== 0 && i !== words.length - 1 && MINOR_WORDS.has(word) ? word : capitalize(word),
        )
        .join(' ')
    },
  },
  { key: 'lower', convert: (w) => lower(w).join(' ') },
  { key: 'upper', convert: (w) => w.map((x) => x.toUpperCase()).join(' ') },
]
