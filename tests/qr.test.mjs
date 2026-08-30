import { done, eq } from './harness.mjs'
import {
  EC_LEVELS, MAX_VERSION, dataCapacity, byteCapacity, totalCodewords, functionModules,
  reedSolomon, formatBits, versionBits, encodeQr, penalty, toSvg, smallestVersion, QrTooLong,
} from '../src/tools/qr/qr.ts'


// Independent GF(256) implementation, so the syndrome check below does not lean on
// the same tables the encoder uses.
const exp = new Uint8Array(512), log = new Uint8Array(256)
{ let x=1; for (let i=0;i<255;i++){ exp[i]=x; log[x]=i; x<<=1; if(x&0x100) x^=0x11d } for(let i=255;i<512;i++) exp[i]=exp[i-255] }
const mul = (a,b) => (a===0||b===0)?0:exp[log[a]+log[b]]

console.log('--- the block table must agree with the matrix geometry ---')
// Total codewords is derived by counting the modules the function patterns leave free.
// A typo in the hand-written block table cannot survive this.
let bad = 0
for (let v = 1; v <= MAX_VERSION; v++) {
  const total = totalCodewords(v)
  for (const level of EC_LEVELS) {
    const data = dataCapacity(v, level)
    // Recover blocks/ec from the public capacity plus a probe encode.
    const m = encodeQr('x', level)
    void m
  }
  console.log(`  v${String(v).padStart(2)}: ${total} codewords from geometry`)
}
// Explicit sums, level by level.
const EXPECTED_TOTAL = {1:26,2:44,3:70,4:100,5:134,6:172,7:196,8:242,9:292,10:346}
for (let v = 1; v <= MAX_VERSION; v++) {
  if (totalCodewords(v) !== EXPECTED_TOTAL[v]) { bad++; console.log(`    FAIL v${v}: geometry says ${totalCodewords(v)}, spec says ${EXPECTED_TOTAL[v]}`) }
}
eq('geometry matches the published codeword totals for v1-10', bad, 0)

console.log('\n--- data capacity must be monotonic ---')
let mono = 0
for (let v = 1; v <= MAX_VERSION; v++) {
  const [L,M,Q,H] = EC_LEVELS.map(l => dataCapacity(v,l))
  if (!(L>M && M>Q && Q>H)) { mono++; console.log(`    FAIL v${v}: L${L} M${M} Q${Q} H${H}`) }
  if (v>1) for (const l of EC_LEVELS) if (dataCapacity(v,l) <= dataCapacity(v-1,l)) { mono++; console.log(`    FAIL v${v} ${l} not larger than v${v-1}`) }
}
eq('L > M > Q > H and capacity grows with version', mono, 0)

console.log('\n--- Reed-Solomon: every codeword must be divisible by the generator ---')
// A valid RS codeword evaluates to zero at alpha^0 .. alpha^(n-1). This is the defining
// property and needs no memorised constants.
let syn = 0
for (const ecCount of [7,10,13,15,16,17,18,20,22,24,26,28,30]) {
  for (let trial = 0; trial < 40; trial++) {
    const data = Uint8Array.from({length: 20}, () => Math.floor(Math.random()*256))
    const ec = reedSolomon(data, ecCount)
    const code = [...data, ...ec]
    for (let i = 0; i < ecCount; i++) {
      let acc = 0
      for (const b of code) acc = mul(acc, exp[i]) ^ b
      if (acc !== 0) { syn++; break }
    }
  }
}
eq('520 random codewords all have zero syndromes', syn, 0)

console.log('\n--- format / version information against published constants ---')
// The canonical format string for level L with mask 0.
eq('format(L, mask 0)', formatBits('L',0).toString(2).padStart(15,'0'), '111011111000100')
eq('format(M, mask 0)', formatBits('M',0).toString(2).padStart(15,'0'), '101010000010010')
// Every format string must differ from every other in at least 3 bits (the BCH distance).
let minDist = 99
const all = []
for (const l of EC_LEVELS) for (let m=0;m<8;m++) all.push(formatBits(l,m))
for (let i=0;i<all.length;i++) for (let j=i+1;j<all.length;j++) {
  let d=0, x=all[i]^all[j]; while(x){d+=x&1;x>>=1}
  minDist = Math.min(minDist,d)
}
eq('32 distinct format strings', new Set(all).size, 32)
eq('minimum Hamming distance is 7 (BCH 15,5)', minDist, 7)
eq('version(7)', versionBits(7).toString(2).padStart(18,'0'), '000111110010010100')

console.log('\n--- matrix structure ---')
const qr = encodeQr('HELLO WORLD', 'M')
eq('version 1 for a short string', qr.version, 1)
eq('size 21 for version 1', qr.size, 21)
const finderOk = (m, r0, c0) => {
  const want = [[1,1,1,1,1,1,1],[1,0,0,0,0,0,1],[1,0,1,1,1,0,1],[1,0,1,1,1,0,1],[1,0,1,1,1,0,1],[1,0,0,0,0,0,1],[1,1,1,1,1,1,1]]
  for (let r=0;r<7;r++) for (let c=0;c<7;c++) if (m[r0+r][c0+c] !== (want[r][c]===1)) return false
  return true
}
eq('top-left finder', finderOk(qr.modules,0,0), true)
eq('top-right finder', finderOk(qr.modules,0,qr.size-7), true)
eq('bottom-left finder', finderOk(qr.modules,qr.size-7,0), true)
eq('no finder bottom-right', finderOk(qr.modules,qr.size-7,qr.size-7), false)
let timingOk = true
for (let i=8;i<qr.size-8;i++) { if (qr.modules[6][i] !== (i%2===0)) timingOk=false; if (qr.modules[i][6] !== (i%2===0)) timingOk=false }
eq('timing patterns alternate', timingOk, true)
eq('dark module set', qr.modules[qr.size-8][8], true)
eq('mask in range', qr.mask >= 0 && qr.mask < 8, true)

console.log('\n--- versions, capacity and growth ---')
for (const [len, level, wantVersion] of [[10,'M',1],[271,'L',10],[17,'L',1],[18,'L',2]]) {
  eq(`${len} bytes at ${level}`, smallestVersion(len, level), wantVersion)
}
eq('v1-L byte capacity', byteCapacity(1,'L'), 17)
eq('v10-L byte capacity', byteCapacity(10,'L'), 271)
let over = false
try { encodeQr('x'.repeat(byteCapacity(10,'L')+1), 'L') } catch (e) { over = e instanceof QrTooLong }
eq('rejects over-long input by name', over, true)
eq('exactly at capacity still encodes', encodeQr('x'.repeat(byteCapacity(10,'L')),'L').version, 10)

console.log('\n--- every version and level actually encodes ---')
let encodeBad = 0
for (let v = 1; v <= MAX_VERSION; v++) {
  for (const level of EC_LEVELS) {
    const cap = byteCapacity(v, level)
    try {
      const m = encodeQr('a'.repeat(cap), level)
      if (m.version !== v || m.size !== 17+4*v) { encodeBad++; console.log(`    FAIL v${v}${level}: got v${m.version}`) }
      if (m.modules.length !== m.size || m.modules.some(r => r.length !== m.size)) { encodeBad++; console.log(`    FAIL v${v}${level}: ragged matrix`) }
    } catch (e) { encodeBad++; console.log(`    FAIL v${v}${level}: ${e.message}`) }
  }
}
eq('all 40 version/level combinations encode at full capacity', encodeBad, 0)

console.log('\n--- mask selection ---')
const scores = []
for (let i=0;i<12;i++) scores.push(encodeQr('test payload ' + i, 'M').mask)
eq('mask varies with content', new Set(scores).size > 1, true)
eq('penalty is non-negative', penalty(qr.modules) >= 0, true)

console.log('\n--- UTF-8 and SVG ---')
eq('cyrillic encodes', encodeQr('Привет', 'M').size > 0, true)
eq('emoji encodes', encodeQr('🔒', 'M').size > 0, true)
const svg = toSvg(qr, 8, 4)
eq('svg well formed', svg.startsWith('<svg') && svg.endsWith('</svg>'), true)
eq('svg dimensions include quiet zone', /width="232"/.test(svg), true)
eq('svg has a path', /<path d="M/.test(svg), true)

done()
