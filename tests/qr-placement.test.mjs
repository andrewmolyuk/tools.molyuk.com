import { encodeQr, functionModules, totalCodewords, MAX_VERSION, EC_LEVELS } from '../src/tools/qr/qr.ts'
import { done, eq } from './harness.mjs'


// Replays the placement walk and checks it is an exact cover of the free modules:
// every non-reserved module visited exactly once, no reserved module touched.
function walkCoverage(version) {
  const size = 17 + 4*version
  const reserved = functionModules(version)
  const visits = Array.from({length:size},()=>new Array(size).fill(0))
  let touchedReserved = 0
  for (let right = size-1; right >= 1; right -= 2) {
    if (right === 6) right = 5
    const upward = ((right + 1) & 2) === 0
    for (let vert = 0; vert < size; vert++) {
      const row = upward ? size-1-vert : vert
      for (const c of [right, right-1]) {
        if (reserved[row][c]) { touchedReserved++; continue }
        visits[row][c]++
      }
    }
  }
  let free = 0, once = 0, more = 0, never = 0
  for (let r=0;r<size;r++) for (let c=0;c<size;c++) {
    if (reserved[r][c]) continue
    free++
    if (visits[r][c] === 1) once++; else if (visits[r][c] > 1) more++; else never++
  }
  return { free, once, more, never, touchedReserved }
}

console.log('--- placement must be an exact cover of the free modules ---')
let coverBad = 0
for (let v = 1; v <= MAX_VERSION; v++) {
  const { free, once, more, never } = walkCoverage(v)
  if (once !== free || more || never) {
    coverBad++
    console.log(`    FAIL v${v}: free ${free}, once ${once}, twice+ ${more}, missed ${never}`)
  }
}
eq('v1-10: every free module written exactly once', coverBad, 0)
const cov1 = walkCoverage(1)
console.log(`  v1: ${cov1.free} free modules = ${totalCodewords(1)} codewords x8 + ${cov1.free - totalCodewords(1)*8} remainder bits`)

console.log('\n--- full decode of a version 1 code (single block, so no interleaving) ---')
const MASKS = [
  (r,c)=>(r+c)%2===0, (r)=>r%2===0, (_r,c)=>c%3===0, (r,c)=>(r+c)%3===0,
  (r,c)=>(Math.floor(r/2)+Math.floor(c/3))%2===0, (r,c)=>((r*c)%2)+((r*c)%3)===0,
  (r,c)=>(((r*c)%2)+((r*c)%3))%2===0, (r,c)=>(((r+c)%2)+((r*c)%3))%2===0,
]
function decodeV1(qr) {
  const size = qr.size
  const reserved = functionModules(qr.version)
  const bits = []
  for (let right = size-1; right >= 1; right -= 2) {
    if (right === 6) right = 5
    const upward = ((right + 1) & 2) === 0
    for (let vert = 0; vert < size; vert++) {
      const row = upward ? size-1-vert : vert
      for (const c of [right, right-1]) {
        if (reserved[row][c]) continue
        // Undo the mask that the encoder reported.
        bits.push((qr.modules[row][c] !== MASKS[qr.mask](row, c)) ? 1 : 0)
      }
    }
  }
  const mode = parseInt(bits.slice(0,4).join(''), 2)
  const length = parseInt(bits.slice(4,12).join(''), 2)
  const bytes = []
  for (let i = 0; i < length; i++) bytes.push(parseInt(bits.slice(12+i*8, 20+i*8).join(''), 2))
  return { mode, length, text: new TextDecoder().decode(new Uint8Array(bytes)) }
}

for (const [text, level] of [['HELLO WORLD','M'], ['https://tools.molyuk.com','L'], ['abc','H'], ['Привет','L']]) {
  const qr = encodeQr(text, level)
  if (qr.version !== 1) { console.log(`  (skipped ${JSON.stringify(text)} — needs v${qr.version})`); continue }
  const got = decodeV1(qr)
  eq(`decode ${JSON.stringify(text)} @${level} (mask ${qr.mask})`, `${got.mode}|${got.text}`, `4|${text}`)
}

done()
