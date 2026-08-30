/**
 * Syllable-based passwords that can be read aloud, dictated over a phone, or typed
 * from memory — at the cost of far fewer bits per character than a random string.
 *
 * Every syllable is one consonant onset followed by one vowel, so a password is a
 * strict alternation of consonant and vowel runs. That shape buys two things at once:
 *
 *  - Readability. A syllable never ends in a consonant, so onsets can never pile up
 *    into clusters like "ksp" — the worst case is a single two-letter onset.
 *  - An exact entropy figure. Consonants and vowels are disjoint, and every maximal
 *    run is therefore exactly one alphabet entry, so a password has exactly one parse
 *    back into the draws that made it. Without that, two different draws could land on
 *    the same string and the reported strength would be an overstatement.
 *
 * The one exception is a closing consonant on the final syllable, which makes the
 * result end like a word. Nothing follows it, so it cannot form a cluster or a second
 * parse.
 */

export const ONSETS = [
  'b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'w', 'z',
  'bl', 'br', 'ch', 'cl', 'cr', 'dr', 'fl', 'fr', 'gl', 'gr',
  'pl', 'pr', 'sh', 'sl', 'sp', 'st', 'th', 'tr',
]

export const VOWELS = ['a', 'e', 'i', 'o', 'u', 'ai', 'au', 'ea', 'ee', 'ia', 'oo', 'ou']

/** Closing consonant for the last syllable only. The empty string is a normal member. */
export const FINAL_CODAS = ['', 'l', 'm', 'n', 'r', 'k', 'x', 'nt', 'st', 'sh']

const DIGIT_COUNT = 2

export type RandomInt = (max: number) => number

export interface SpokenOptions {
  syllables: number
  capitalize: boolean
  digits: boolean
}

// Derived from the alphabets rather than hardcoded, so editing a list above keeps the
// length estimate honest instead of silently drifting.
const mean = (list: readonly string[]) => list.reduce((sum, s) => sum + s.length, 0) / list.length
const MEAN_SYLLABLE = mean(ONSETS) + mean(VOWELS)
const MEAN_CODA = mean(FINAL_CODAS)

/**
 * Picks the syllable count whose expected output is closest to the requested length.
 * Only whole syllables exist, so short targets can still land a character or two off —
 * the field is labelled as approximate for that reason.
 */
export function syllableCountFor(length: number): number {
  return Math.min(Math.max(Math.round((length - MEAN_CODA) / MEAN_SYLLABLE), 2), 40)
}

/** Exact for this construction: every draw is uniform and the result decodes uniquely. */
export function entropyBits({ syllables, capitalize, digits }: SpokenOptions): number {
  const perSyllable = Math.log2(ONSETS.length) + Math.log2(VOWELS.length) + (capitalize ? 1 : 0)
  return (
    syllables * perSyllable +
    Math.log2(FINAL_CODAS.length) +
    (digits ? DIGIT_COUNT * Math.log2(10) : 0)
  )
}

export function makePronounceable(options: SpokenOptions, randomInt: RandomInt): string {
  const pick = <T>(list: readonly T[]): T => list[randomInt(list.length)]
  let out = ''
  for (let i = 0; i < options.syllables; i++) {
    const syllable = pick(ONSETS) + pick(VOWELS)
    // One bit per syllable, which entropyBits() accounts for.
    out += options.capitalize && randomInt(2) === 1
      ? syllable[0].toUpperCase() + syllable.slice(1)
      : syllable
  }
  out += pick(FINAL_CODAS)
  if (options.digits) {
    for (let i = 0; i < DIGIT_COUNT; i++) out += String(randomInt(10))
  }
  return out
}
