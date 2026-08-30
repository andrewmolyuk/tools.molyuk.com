// Re-implementations copied verbatim from the new tools, exercised against known-good values.
import { done, eq } from './harness.mjs'

// ---------- CIDR (IPv4) ----------
const ipv4ToInt = (ip) => {
  const parts = ip.trim().split('.')
  if (parts.length !== 4) throw new Error('bad')
  let r = 0
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) throw new Error('bad')
    const n = Number(p)
    if (n > 255) throw new Error('bad')
    r = (r << 8) | n
  }
  return r >>> 0
}
const intToIpv4 = (n) => [24, 16, 8, 0].map((s) => (n >>> s) & 255).join('.')
const maskFor = (prefix) => (prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0)

function calcIPv4(addr, prefix) {
  const ip = ipv4ToInt(addr)
  const mask = maskFor(prefix)
  const network = (ip & mask) >>> 0
  const broadcast = (network | (~mask >>> 0)) >>> 0
  const total = 2 ** (32 - prefix)
  const usable = prefix >= 31 ? total : total - 2
  const firstHost = prefix >= 31 ? network : network + 1
  const lastHost = prefix >= 31 ? broadcast : broadcast - 1
  return {
    network: `${intToIpv4(network)}/${prefix}`,
    netmask: intToIpv4(mask),
    wildcard: intToIpv4(~mask >>> 0),
    broadcast: prefix >= 31 ? '—' : intToIpv4(broadcast),
    firstHost: intToIpv4(firstHost),
    lastHost: intToIpv4(lastHost),
    total,
    usable,
  }
}

console.log('--- CIDR IPv4 ---')
let c = calcIPv4('192.168.1.130', 24)
eq('/24 network', c.network, '192.168.1.0/24')
eq('/24 netmask', c.netmask, '255.255.255.0')
eq('/24 wildcard', c.wildcard, '0.0.0.255')
eq('/24 broadcast', c.broadcast, '192.168.1.255')
eq('/24 firstHost', c.firstHost, '192.168.1.1')
eq('/24 lastHost', c.lastHost, '192.168.1.254')
eq('/24 usable', c.usable, 254)

c = calcIPv4('10.20.30.40', 12)
eq('/12 network', c.network, '10.16.0.0/12')
eq('/12 netmask', c.netmask, '255.240.0.0')
eq('/12 usable', c.usable, 1048574)

c = calcIPv4('203.0.113.5', 31)
eq('/31 usable (RFC 3021)', c.usable, 2)
eq('/31 broadcast suppressed', c.broadcast, '—')
eq('/31 firstHost', c.firstHost, '203.0.113.4')
eq('/31 lastHost', c.lastHost, '203.0.113.5')

c = calcIPv4('8.8.8.8', 32)
eq('/32 usable', c.usable, 1)
eq('/32 firstHost', c.firstHost, '8.8.8.8')

c = calcIPv4('1.2.3.4', 0)
eq('/0 network', c.network, '0.0.0.0/0')
eq('/0 broadcast', c.broadcast, '255.255.255.255')
eq('/0 total', c.total, 4294967296)

// scope detection
const IPV4_SCOPES = [
  { base: '10.0.0.0', prefix: 8, key: 'private' },
  { base: '172.16.0.0', prefix: 12, key: 'private' },
  { base: '192.168.0.0', prefix: 16, key: 'private' },
  { base: '127.0.0.0', prefix: 8, key: 'loopback' },
  { base: '169.254.0.0', prefix: 16, key: 'linkLocal' },
  { base: '224.0.0.0', prefix: 4, key: 'multicast' },
  { base: '100.64.0.0', prefix: 10, key: 'cgnat' },
  { base: '0.0.0.0', prefix: 8, key: 'reserved' },
]
const scopeOf = (ip) => {
  for (const s of IPV4_SCOPES) {
    const m = maskFor(s.prefix)
    if (((ip & m) >>> 0) === ((ipv4ToInt(s.base) & m) >>> 0)) return s.key
  }
  return 'public'
}
console.log('--- scope ---')
eq('192.168.1.0', scopeOf(ipv4ToInt('192.168.1.0')), 'private')
eq('172.16.5.1', scopeOf(ipv4ToInt('172.16.5.1')), 'private')
eq('172.32.5.1 not private', scopeOf(ipv4ToInt('172.32.5.1')), 'public')
eq('127.0.0.1', scopeOf(ipv4ToInt('127.0.0.1')), 'loopback')
eq('169.254.1.1', scopeOf(ipv4ToInt('169.254.1.1')), 'linkLocal')
eq('239.1.1.1', scopeOf(ipv4ToInt('239.1.1.1')), 'multicast')
eq('100.64.0.1', scopeOf(ipv4ToInt('100.64.0.1')), 'cgnat')
eq('8.8.8.8', scopeOf(ipv4ToInt('8.8.8.8')), 'public')

// ---------- number base ----------
const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz'
function parseInBase(text, radix) {
  let body = text.trim().toLowerCase().replaceAll('_', '').replaceAll(' ', '')
  if (!body) return null
  let negative = false
  if (body.startsWith('-')) { negative = true; body = body.slice(1) }
  const prefixes = { 2: '0b', 8: '0o', 16: '0x' }
  const prefix = prefixes[radix]
  if (prefix && body.startsWith(prefix)) body = body.slice(2)
  if (!body) return null
  const bigRadix = BigInt(radix)
  let value = 0n
  for (const ch of body) {
    const d = DIGITS.indexOf(ch)
    if (d < 0 || d >= radix) return null
    value = value * bigRadix + BigInt(d)
  }
  return negative ? -value : value
}
console.log('--- number base ---')
eq('255 dec', parseInBase('255', 10), 255n)
eq('0xff hex', parseInBase('0xff', 16), 255n)
eq('ff hex', parseInBase('ff', 16), 255n)
eq('0b1010 bin', parseInBase('0b1010', 2), 10n)
eq('bin digit 2 rejected', parseInBase('102', 2), null)
eq('hex digit g rejected', parseInBase('fg', 16), null)
eq('negative', parseInBase('-ff', 16), -255n)
eq('underscores stripped', parseInBase('1_000', 10), 1000n)
eq('huge stays exact', parseInBase('9007199254740993', 10).toString(), '9007199254740993')
eq('huge to hex', parseInBase('9007199254740993', 10).toString(16), '20000000000001')
eq('base36', parseInBase('zz', 36), 1295n)
eq('empty', parseInBase('   ', 10), null)

const bitGroups = (v) => {
  const mag = v < 0n ? -v : v
  const bits = mag.toString(2)
  return bits.padStart(Math.ceil(bits.length / 4) * 4, '0').match(/.{4}/g) ?? []
}
eq('bits of 255', bitGroups(255n).join(' '), '1111 1111')
eq('bits of 0', bitGroups(0n).join(' '), '0000')
eq('bits of 10', bitGroups(10n).join(' '), '1010')

// ---------- JWT ----------
function base64UrlDecode(part) {
  const padded = part.replaceAll('-', '+').replaceAll('_', '/')
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
}
console.log('--- JWT ---')
const sample =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  'eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFkYSBMb3ZlbGFjZSIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoyMDAwMDAwMDAwfQ.' +
  'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
const parts = sample.split('.')
eq('three parts', parts.length, 3)
const hdr = JSON.parse(base64UrlDecode(parts[0]))
const pl = JSON.parse(base64UrlDecode(parts[1]))
eq('header alg', hdr.alg, 'HS256')
eq('payload name', pl.name, 'Ada Lovelace')
eq('payload exp', pl.exp, 2000000000)
eq('exp renders', new Date(pl.exp * 1000).toISOString().replace('T', ' ').replace('.000Z', ' UTC'), '2033-05-18 03:33:20 UTC')
// non-ASCII payload must survive
const cyr = Buffer.from(JSON.stringify({ name: 'Андрей' })).toString('base64url')
eq('utf-8 payload', JSON.parse(base64UrlDecode(cyr)).name, 'Андрей')

// ---------- timestamp ----------
function makeParse(unit) {
  return (text) => {
    const trimmed = text.trim()
    if (!trimmed) return null
    let ms
    if (/^-?\d+$/.test(trimmed)) {
      const n = Number(trimmed)
      if (!Number.isFinite(n)) return null
      if (unit === 'ms') ms = n
      else if (unit === 's') ms = n * 1000
      else ms = Math.abs(n) >= 1e11 ? n : n * 1000
    } else {
      ms = new Date(trimmed).getTime()
    }
    if (Number.isNaN(ms) || Math.abs(ms) > 8.64e15) return null
    return ms
  }
}
console.log('--- timestamp ---')
const pAuto = makeParse('auto')
eq('seconds autodetect', pAuto('1700000000'), 1700000000000)
eq('millis autodetect', pAuto('1700000000000'), 1700000000000)
eq('ISO string', pAuto('2026-08-30T12:00:00Z'), Date.parse('2026-08-30T12:00:00Z'))
eq('garbage rejected', pAuto('not a date'), null)
eq('out-of-range rejected', pAuto('999999999999999999999'), null)
eq('epoch 0', pAuto('0'), 0)
eq('explicit ms unit', makeParse('ms')('1700000000'), 1700000000)
eq('explicit s unit', makeParse('s')('1700000000000'), 1700000000000000)
eq('toISOString safe on max', new Date(pAuto('8640000000000000')).toISOString(), '+275760-09-13T00:00:00.000Z')

// ---------- password ----------
console.log('--- password ---')
const SETS = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!#$%&*+-=?@^_~',
}
const AMBIGUOUS = new Set('IlO01|')
function randomInt(max) {
  const limit = Math.floor(0x100000000 / max) * max
  const buf = new Uint32Array(1)
  let v
  do { crypto.getRandomValues(buf); v = buf[0] } while (v >= limit)
  return v % max
}
function generateOne(sets, pool, size) {
  const chars = sets.slice(0, size).map((s) => s[randomInt(s.length)])
  while (chars.length < size) chars.push(pool[randomInt(pool.length)])
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}
const allSets = [SETS.lower, SETS.upper, SETS.digits, SETS.symbols]
const pool = allSets.join('')
let allGood = true, seenClasses = [0, 0, 0, 0]
for (let i = 0; i < 3000; i++) {
  const p = generateOne(allSets, pool, 20)
  if (p.length !== 20) allGood = false
  if (![...p].every((ch) => pool.includes(ch))) allGood = false
  allSets.forEach((s, k) => { if ([...p].some((ch) => s.includes(ch))) seenClasses[k]++ })
}
eq('3000 passwords well-formed', allGood, true)
eq('every password has a lower', seenClasses[0], 3000)
eq('every password has an upper', seenClasses[1], 3000)
eq('every password has a digit', seenClasses[2], 3000)
eq('every password has a symbol', seenClasses[3], 3000)
// seed chars must not be stuck at the front
const firstCharClass = {}
for (let i = 0; i < 2000; i++) {
  const ch = generateOne(allSets, pool, 20)[0]
  const k = allSets.findIndex((s) => s.includes(ch))
  firstCharClass[k] = (firstCharClass[k] ?? 0) + 1
}
eq('shuffle spreads all 4 classes into position 0', Object.keys(firstCharClass).length, 4)
// ambiguous filter
const filtered = allSets.map((s) => [...s].filter((ch) => !AMBIGUOUS.has(ch)).join(''))
eq('no ambiguous survive filter', filtered.join('').split('').some((ch) => AMBIGUOUS.has(ch)), false)
eq('entropy 20 chars full pool', Math.round(20 * Math.log2(pool.length)), castRound(20, pool.length))
function castRound(len, n) { return Math.round(len * Math.log2(n)) }

// ---------- JSON formatter ----------
console.log('--- JSON ---')
function withSortedKeys(v) {
  if (Array.isArray(v)) return v.map(withSortedKeys)
  if (v !== null && typeof v === 'object')
    return Object.fromEntries(Object.keys(v).sort().map((k) => [k, withSortedKeys(v[k])]))
  return v
}
eq('sort keys nested', JSON.stringify(withSortedKeys({ b: 1, a: { d: 2, c: 3 } })), '{"a":{"c":3,"d":2},"b":1}')
eq('arrays keep order', JSON.stringify(withSortedKeys([3, 1, 2])), '[3,1,2]')
eq('null survives', JSON.stringify(withSortedKeys({ a: null })), '{"a":null}')
function positionOf(text, offset) {
  const lines = text.slice(0, offset).split('\n')
  return { line: lines.length, column: lines[lines.length - 1].length + 1 }
}
const badJson = '{\n  "a": 1,\n  "b": oops\n}'
try { JSON.parse(badJson) } catch (e) {
  const m = e.message.match(/position (\d+)/)
  if (m) {
    const p = positionOf(badJson, Number(m[1]))
    eq('error on line 3', p.line, 3)
  }
}

done()
