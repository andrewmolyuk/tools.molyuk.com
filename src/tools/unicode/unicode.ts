/**
 * Character-level inspection: what a string is actually made of.
 *
 * The reason to reach for this is almost always a mismatch between what a string looks
 * like and what it is — mojibake, an invisible character pasted from a document, a
 * combining mark that makes two visually identical strings compare unequal, or a
 * length that disagrees with the eye because JavaScript counts UTF-16 units.
 */

export interface CodePoint {
  /** The character itself, or a placeholder when it has no visible form. */
  text: string
  code: number
  hex: string
  name: string | null
  invisible: boolean
  utf8: number[]
  utf16: number[]
  escapes: { js: string; json: string; html: string; url: string; css: string }
}

/**
 * Named ranges, not a full Unicode database — that table is larger than this whole site.
 * These are the ones worth naming: what people paste by accident, and what breaks
 * comparisons.
 */
const NAMED: { from: number; to: number; name: string }[] = [
  { from: 0x00, to: 0x08, name: 'C0 control' },
  { from: 0x09, to: 0x09, name: 'TAB' },
  { from: 0x0a, to: 0x0a, name: 'LINE FEED' },
  { from: 0x0d, to: 0x0d, name: 'CARRIAGE RETURN' },
  { from: 0x0b, to: 0x1f, name: 'C0 control' },
  { from: 0x20, to: 0x20, name: 'SPACE' },
  { from: 0x7f, to: 0x9f, name: 'control' },
  { from: 0xa0, to: 0xa0, name: 'NO-BREAK SPACE' },
  { from: 0xad, to: 0xad, name: 'SOFT HYPHEN' },
  { from: 0x0300, to: 0x036f, name: 'combining diacritical mark' },
  { from: 0x2000, to: 0x200a, name: 'typographic space' },
  { from: 0x200b, to: 0x200b, name: 'ZERO WIDTH SPACE' },
  { from: 0x200c, to: 0x200c, name: 'ZERO WIDTH NON-JOINER' },
  { from: 0x200d, to: 0x200d, name: 'ZERO WIDTH JOINER' },
  { from: 0x200e, to: 0x200f, name: 'bidirectional mark' },
  { from: 0x2010, to: 0x2015, name: 'dash' },
  { from: 0x2018, to: 0x201f, name: 'typographic quote' },
  { from: 0x2028, to: 0x2029, name: 'line/paragraph separator' },
  { from: 0x202a, to: 0x202e, name: 'bidirectional override' },
  { from: 0x2060, to: 0x2064, name: 'invisible operator' },
  { from: 0x2066, to: 0x2069, name: 'bidirectional isolate' },
  { from: 0xfeff, to: 0xfeff, name: 'ZERO WIDTH NO-BREAK SPACE (BOM)' },
  { from: 0xfffd, to: 0xfffd, name: 'REPLACEMENT CHARACTER' },
  { from: 0x1f300, to: 0x1faff, name: 'emoji' },
  { from: 0xe0000, to: 0xe007f, name: 'tag character' },
]

/** Code points that render as nothing, or as something other than themselves. */
const INVISIBLE = (code: number) =>
  code < 0x20 ||
  (code >= 0x7f && code <= 0xa0) ||
  code === 0xad ||
  (code >= 0x200b && code <= 0x200f) ||
  (code >= 0x2028 && code <= 0x202e) ||
  (code >= 0x2060 && code <= 0x2064) ||
  (code >= 0x2066 && code <= 0x2069) ||
  code === 0xfeff ||
  (code >= 0xe0000 && code <= 0xe007f)

function nameOf(code: number): string | null {
  for (const range of NAMED) {
    if (code >= range.from && code <= range.to) return range.name
  }
  return null
}

function utf8Bytes(char: string): number[] {
  return Array.from(new TextEncoder().encode(char))
}

function utf16Units(char: string): number[] {
  const units: number[] = []
  for (let i = 0; i < char.length; i++) units.push(char.charCodeAt(i))
  return units
}

export function inspect(input: string): CodePoint[] {
  return Array.from(input).map((char) => {
    const code = char.codePointAt(0)!
    const hex = code.toString(16).toUpperCase().padStart(4, '0')
    const utf16 = utf16Units(char)
    const invisible = INVISIBLE(code)

    return {
      text: char,
      code,
      hex,
      name: nameOf(code),
      invisible,
      utf8: utf8Bytes(char),
      utf16,
      escapes: {
        // Above the BMP, \u needs the braced form or a surrogate pair.
        js: code > 0xffff ? `\\u{${hex}}` : `\\u${hex}`,
        json: utf16.map((unit) => `\\u${unit.toString(16).toUpperCase().padStart(4, '0')}`).join(''),
        html: `&#${code};`,
        url: utf8Bytes(char)
          .map((b) => `%${b.toString(16).toUpperCase().padStart(2, '0')}`)
          .join(''),
        css: `\\${hex} `,
      },
    }
  })
}

export interface Summary {
  codePoints: number
  utf16Units: number
  utf8Bytes: number
  graphemes: number | null
  invisible: number
  nonAscii: number
}

export function summarize(input: string, locale = 'en'): Summary {
  const points = Array.from(input)
  return {
    codePoints: points.length,
    // JavaScript's own .length, which is where "why is this 4?" usually starts.
    utf16Units: input.length,
    utf8Bytes: new TextEncoder().encode(input).length,
    graphemes: countGraphemes(input, locale),
    invisible: points.filter((c) => INVISIBLE(c.codePointAt(0)!)).length,
    nonAscii: points.filter((c) => c.codePointAt(0)! > 0x7f).length,
  }
}

/** What a reader would call "characters". Intl.Segmenter is not everywhere yet. */
function countGraphemes(input: string, locale: string): number | null {
  const Segmenter = (Intl as { Segmenter?: new (l: string, o: object) => { segment(s: string): Iterable<unknown> } })
    .Segmenter
  if (!Segmenter) return null
  return [...new Segmenter(locale, { granularity: 'grapheme' }).segment(input)].length
}

export const NORMALISATIONS = ['NFC', 'NFD', 'NFKC', 'NFKD'] as const
export type Normalisation = (typeof NORMALISATIONS)[number]

/**
 * Two strings can look identical and still differ. Showing each normal form with its
 * byte count makes that visible, which is the usual reason a comparison fails.
 */
export function normalisations(input: string): { form: Normalisation; text: string; bytes: number; same: boolean }[] {
  return NORMALISATIONS.map((form) => {
    const text = input.normalize(form)
    return { form, text, bytes: new TextEncoder().encode(text).length, same: text === input }
  })
}
