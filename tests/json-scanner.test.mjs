import { done, eq } from './harness.mjs'
// Scanner copied verbatim from JsonFormatter.vue.
const WHITESPACE = ' \t\n\r'
const NUMBER = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/

function skipWs(text, i) {
  while (i < text.length && WHITESPACE.includes(text[i])) i++
  return i
}
function scanString(text, i) {
  i++
  while (i < text.length) {
    const ch = text[i]
    if (ch === '"') return i + 1
    if (ch === '\\') {
      const esc = text[i + 1]
      if (esc === undefined) throw i + 1
      if (esc === 'u') {
        if (!/^[0-9a-fA-F]{4}$/.test(text.slice(i + 2, i + 6))) throw i + 2
        i += 6
        continue
      }
      if (!'"\\/bfnrt'.includes(esc)) throw i + 1
      i += 2
      continue
    }
    if (ch < ' ') throw i
    i++
  }
  throw i
}
function scanObject(text, i) {
  i = skipWs(text, i + 1)
  if (text[i] === '}') return i + 1
  for (;;) {
    i = skipWs(text, i)
    if (text[i] !== '"') throw i
    i = skipWs(text, scanString(text, i))
    if (text[i] !== ':') throw i
    i = skipWs(text, scanValue(text, i + 1))
    if (text[i] === ',') { i++; continue }
    if (text[i] === '}') return i + 1
    throw i
  }
}
function scanArray(text, i) {
  i = skipWs(text, i + 1)
  if (text[i] === ']') return i + 1
  for (;;) {
    i = skipWs(text, scanValue(text, i))
    if (text[i] === ',') { i++; continue }
    if (text[i] === ']') return i + 1
    throw i
  }
}
function scanValue(text, i) {
  i = skipWs(text, i)
  if (i >= text.length) throw i
  const ch = text[i]
  if (ch === '"') return scanString(text, i)
  if (ch === '{') return scanObject(text, i)
  if (ch === '[') return scanArray(text, i)
  for (const literal of ['true', 'false', 'null']) {
    if (text.startsWith(literal, i)) return i + literal.length
  }
  const match = NUMBER.exec(text.slice(i))
  if (match?.[0]) return i + match[0].length
  throw i
}
function errorOffset(text) {
  try {
    const end = skipWs(text, scanValue(text, 0))
    return end < text.length ? end : null
  } catch (e) {
    return typeof e === 'number' ? e : null
  }
}
const positionOf = (text, offset) => {
  const lines = text.slice(0, offset).split('\n')
  return { line: lines.length, column: lines[lines.length - 1].length + 1 }
}


console.log('--- valid JSON must report no error ---')
const valid = [
  '{}', '[]', '  {"a":1}  ', '{"a":[1,2,{"b":null}]}', '[true,false,null]',
  '{"n":-1.5e+10}', '{"s":"a\\"b\\\\c\\u00ff"}', '"bare string"', '42', 'null',
  '{"nested":{"deep":{"deeper":[1,[2,[3]]]}}}', '[\n  1,\n  2\n]', '0', '-0.5',
  '{"unicode":"Андрей ☃"}', '{"empty":{},"also":[]}',
]
for (const v of valid) {
  const scanned = errorOffset(v)
  let parses = true
  try { JSON.parse(v) } catch { parses = false }
  eq(`valid ${JSON.stringify(v).slice(0, 34)}`, `parse=${parses} scan=${scanned}`, 'parse=true scan=null')
}

console.log('\n--- invalid JSON must report a position ---')
const invalid = [
  ['{\n  "a": 1,\n  "b": oops\n}', 3],
  ['{"a":}', 1],
  ['[1,2,', 1],
  ['{bad}', 1],
  ['{"a" 1}', 1],
  ['[1 2]', 1],
  ['{"a":1,}', 1],
  ['[1,]', 1],
  ['{"a":"unterminated', 1],
  ['{"a":01}', 1],
  ['{"a":.5}', 1],
  ['{"a":1}trailing', 1],
  ['{"a":"bad\\qescape"}', 1],
  ['{"a":"bad\\u00zz"}', 1],
  ['tru', 1],
  ['', 1],
  ['{"a":1,\n"b":2,\n"c":}', 3],
]
for (const [text, wantLine] of invalid) {
  let parses = true
  try { JSON.parse(text) } catch { parses = false }
  const off = errorOffset(text)
  const pos = off === null ? null : positionOf(text, off)
  eq(
    `invalid ${JSON.stringify(text).slice(0, 34)}`,
    `parse=${parses} line=${pos ? pos.line : 'none'}`,
    `parse=false line=${wantLine}`,
  )
}

console.log('\n--- fuzz: scanner verdict must agree with JSON.parse ---')
const seeds = [
  '{"a":1,"b":[1,2,3],"c":{"d":"x"},"e":null,"f":true}',
  '[{"id":1,"tags":["x","y"]},{"id":2,"tags":[]}]',
  '{"s":"a\\"b","n":-1.5e10,"deep":{"q":[{"r":false}]}}',
]
const chars = '{}[]",:0189abtrunel \n\\.-+eE'
let agree = 0, disagree = 0
let rng = 12345
const rand = (n) => { rng = (rng * 1103515245 + 12345) & 0x7fffffff; return rng % n }
for (let iter = 0; iter < 40000; iter++) {
  const seed = seeds[rand(seeds.length)]
  const a = [...seed]
  const edits = 1 + rand(3)
  for (let k = 0; k < edits; k++) {
    const at = rand(a.length)
    const op = rand(3)
    if (op === 0) a[at] = chars[rand(chars.length)]
    else if (op === 1) a.splice(at, 1)
    else a.splice(at, 0, chars[rand(chars.length)])
  }
  const text = a.join('')
  let parses = true
  try { JSON.parse(text) } catch { parses = false }
  const scanSaysValid = errorOffset(text) === null
  if (parses === scanSaysValid) agree++
  else {
    disagree++
    if (disagree <= 5) console.log(`  MISMATCH parse=${parses} scan=${scanSaysValid} :: ${JSON.stringify(text)}`)
  }
}
eq(`40000 mutations agree with JSON.parse`, disagree, 0)
console.log(`  (${agree} agreements)`)

done()
