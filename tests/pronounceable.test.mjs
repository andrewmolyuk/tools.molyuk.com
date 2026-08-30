import { done, eq, near } from './harness.mjs'
// Imports the real module — no copied logic, so this cannot drift from what ships.
import {
  ONSETS, VOWELS, FINAL_CODAS, entropyBits, makePronounceable, syllableCountFor,
} from '../src/tools/password/pronounceable.ts'
import { webcrypto } from 'node:crypto'


console.log('--- alphabet invariants the entropy claim rests on ---')
eq('onsets', ONSETS.length, 36)
eq('vowels', VOWELS.length, 12)
eq('final codas (incl. empty)', FINAL_CODAS.length, 10)
eq('no duplicate onsets', new Set(ONSETS).size, ONSETS.length)
eq('no duplicate vowels', new Set(VOWELS).size, VOWELS.length)
eq('no duplicate codas', new Set(FINAL_CODAS).size, FINAL_CODAS.length)

const onsetChars = new Set(ONSETS.join(''))
const vowelChars = new Set(VOWELS.join(''))
const codaChars = new Set(FINAL_CODAS.join(''))
eq('consonants and vowels disjoint', [...onsetChars].some((c) => vowelChars.has(c)), false)
eq('codas contain no vowel letters', [...codaChars].some((c) => vowelChars.has(c)), false)

console.log('\n--- readability: no consonant cluster longer than 2 ---')
// Identical to randomInt() in PasswordGenerator.vue — the suite exercises what ships.
const randomInt = (max) => {
  const limit = Math.floor(0x100000000 / max) * max
  const buf = new Uint32Array(1)
  let v
  do { webcrypto.getRandomValues(buf); v = buf[0] } while (v >= limit)
  return v % max
}
let worstCluster = 0, worstExample = ''
for (let i = 0; i < 20000; i++) {
  const pw = makePronounceable({ syllables: 6, capitalize: false, digits: false }, randomInt)
  for (const run of pw.match(/[^aeiou]+/g) ?? []) {
    if (run.length > worstCluster) { worstCluster = run.length; worstExample = pw }
  }
}
eq('longest consonant run over 20k passwords', worstCluster, 2)
if (worstCluster > 2) console.log('    example:', worstExample)

console.log('\n--- exhaustive: one syllable must yield all-distinct strings ---')
const oneSyllable = new Set()
for (const o of ONSETS) for (const v of VOWELS) oneSyllable.add(o + v)
eq('distinct 1-syllable strings', oneSyllable.size, ONSETS.length * VOWELS.length)

console.log('\n--- every generated password must have exactly ONE parse ---')
// Grammar: (onset vowel)+ coda. More than one parse would mean two distinct draws can
// produce the same string, making the reported entropy an overstatement.
function countParses(s) {
  const memo = new Map()
  const walk = (i, syllables) => {
    const key = `${i}`
    if (memo.has(key)) return memo.get(key)
    let total = 0
    if (syllables > 0) {
      for (const c of FINAL_CODAS) if (i + c.length === s.length && s.startsWith(c, i)) total++
    }
    for (const o of ONSETS) {
      if (!s.startsWith(o, i)) continue
      for (const v of VOWELS) {
        if (!s.startsWith(v, i + o.length)) continue
        total += walk(i + o.length + v.length, syllables + 1)
      }
    }
    memo.set(key, total)
    return total
  }
  return walk(0, 0)
}

let multi = 0, zero = 0, samples = 0
const seen = new Map()
for (const syl of [1, 2, 3, 4, 5, 6, 8]) {
  for (let i = 0; i < 4000; i++) {
    for (const [capitalize, digits] of [[false, false], [true, false], [false, true], [true, true]]) {
      const pw = makePronounceable({ syllables: syl, capitalize, digits }, randomInt)
      // Capitalisation and trailing digits are recoverable extras; injectivity of the
      // letter core is what matters, so test the bare lowercase form.
      const core = pw.replace(/\d+$/, '').toLowerCase()
      const n = countParses(core)
      samples++
      if (n === 0) zero++
      if (n > 1) { multi++; if (multi <= 3) console.log(`    AMBIGUOUS (${n} parses): ${core}`) }
      if (syl === 2 && !capitalize && !digits) seen.set(core, (seen.get(core) ?? 0) + 1)
    }
  }
}
eq(`${samples} generated passwords, none unparseable`, zero, 0)
eq(`${samples} generated passwords, none ambiguous`, multi, 0)

console.log('\n--- entropy formula matches the actual construction ---')
near('1 syllable == log2(onsets*vowels*codas)',
  entropyBits({ syllables: 1, capitalize: false, digits: false }),
  Math.log2(ONSETS.length * VOWELS.length * FINAL_CODAS.length), 1e-9)
near('capitalize adds exactly 1 bit/syllable',
  entropyBits({ syllables: 7, capitalize: true, digits: false }) -
  entropyBits({ syllables: 7, capitalize: false, digits: false }), 7, 1e-9)
near('digits add log2(100)',
  entropyBits({ syllables: 7, capitalize: false, digits: true }) -
  entropyBits({ syllables: 7, capitalize: false, digits: false }), Math.log2(100), 1e-9)

// Empirical collision rate must match the birthday prediction for a uniform space.
const distinct = seen.size
const drawn = [...seen.values()].reduce((a, b) => a + b, 0)
const space = (ONSETS.length * VOWELS.length) ** 2 * FINAL_CODAS.length
const expected = (drawn * (drawn - 1)) / (2 * space)
console.log(`  2-syllable space = ${space.toLocaleString('en-US')}, drew ${drawn}, distinct ${distinct}`)
const collOk = Math.abs((drawn - distinct) - expected) < Math.max(8, 4 * Math.sqrt(expected + 1))
if (!collOk) fails++
console.log(`${collOk ? 'ok  ' : 'FAIL'} collisions match a uniform space: observed ${drawn - distinct}, birthday-expected ≈ ${expected.toFixed(2)}`)

console.log('\n--- length mapping ---')
eq('length 6 -> 2 syllables', syllableCountFor(6), 2)
eq('length 20 -> 6 syllables', syllableCountFor(20), 6)
eq('never below 2', syllableCountFor(1), 2)
eq('capped at 40', syllableCountFor(1000), 40)

for (const target of [8, 12, 20, 32]) {
  const syl = syllableCountFor(target)
  let total = 0
  for (let i = 0; i < 20000; i++) {
    total += makePronounceable({ syllables: syl, capitalize: false, digits: false }, randomInt).length
  }
  const avg = total / 20000
  const drift = Math.abs(avg - target) / target
  const ok = drift < 0.2
  if (!ok) fails++
  console.log(`${ok ? 'ok  ' : 'FAIL'} target ${target} -> ${syl} syllables, mean ${avg.toFixed(1)} chars (${(drift * 100).toFixed(0)}% off)`)
}

console.log('\n--- bits per character, the honest tradeoff ---')
const syl20 = syllableCountFor(20)
const spokenBits = entropyBits({ syllables: syl20, capitalize: false, digits: false })
let len = 0
for (let i = 0; i < 20000; i++) len += makePronounceable({ syllables: syl20, capitalize: false, digits: false }, randomInt).length
console.log(`  pronounceable: ${spokenBits.toFixed(0)} bits over ~${(len / 20000).toFixed(1)} chars = ${(spokenBits / (len / 20000)).toFixed(2)} bits/char`)
console.log(`  random (78-char pool): 20 chars = ${(20 * Math.log2(78)).toFixed(0)} bits = ${Math.log2(78).toFixed(2)} bits/char`)

console.log('\n--- readability spot check ---')
for (let i = 0; i < 8; i++) {
  console.log('   ', makePronounceable({ syllables: 7, capitalize: true, digits: true }, randomInt))
}

done()
