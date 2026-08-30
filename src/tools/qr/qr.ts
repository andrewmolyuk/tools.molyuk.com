/**
 * QR encoder — byte mode, versions 1–10, all four error-correction levels.
 *
 * Versions stop at 10 deliberately. The block table below is spec data that cannot be
 * derived, and every row here is cross-checked in tests against the codeword count
 * computed from the matrix geometry; extending the range means adding rows that carry
 * the same burden of proof. Version 10 holds 271 bytes at level L, which covers URLs,
 * Wi-Fi strings and contact payloads.
 */

export type EcLevel = 'L' | 'M' | 'Q' | 'H'

export const EC_LEVELS: EcLevel[] = ['L', 'M', 'Q', 'H']
export const MAX_VERSION = 10

/** Bits identifying the level inside the format information. */
const EC_BITS: Record<EcLevel, number> = { L: 0b01, M: 0b00, Q: 0b11, H: 0b10 }

/**
 * Per version and level: EC codewords per block, then the two block groups as
 * [blockCount, dataCodewordsPerBlock]. The second group is empty when all blocks are
 * the same size.
 */
interface BlockSpec {
  ecPerBlock: number
  group1: [number, number]
  group2: [number, number]
}

const BLOCKS: Record<number, Record<EcLevel, BlockSpec>> = {
  1: {
    L: { ecPerBlock: 7, group1: [1, 19], group2: [0, 0] },
    M: { ecPerBlock: 10, group1: [1, 16], group2: [0, 0] },
    Q: { ecPerBlock: 13, group1: [1, 13], group2: [0, 0] },
    H: { ecPerBlock: 17, group1: [1, 9], group2: [0, 0] },
  },
  2: {
    L: { ecPerBlock: 10, group1: [1, 34], group2: [0, 0] },
    M: { ecPerBlock: 16, group1: [1, 28], group2: [0, 0] },
    Q: { ecPerBlock: 22, group1: [1, 22], group2: [0, 0] },
    H: { ecPerBlock: 28, group1: [1, 16], group2: [0, 0] },
  },
  3: {
    L: { ecPerBlock: 15, group1: [1, 55], group2: [0, 0] },
    M: { ecPerBlock: 26, group1: [1, 44], group2: [0, 0] },
    Q: { ecPerBlock: 18, group1: [2, 17], group2: [0, 0] },
    H: { ecPerBlock: 22, group1: [2, 13], group2: [0, 0] },
  },
  4: {
    L: { ecPerBlock: 20, group1: [1, 80], group2: [0, 0] },
    M: { ecPerBlock: 18, group1: [2, 32], group2: [0, 0] },
    Q: { ecPerBlock: 26, group1: [2, 24], group2: [0, 0] },
    H: { ecPerBlock: 16, group1: [4, 9], group2: [0, 0] },
  },
  5: {
    L: { ecPerBlock: 26, group1: [1, 108], group2: [0, 0] },
    M: { ecPerBlock: 24, group1: [2, 43], group2: [0, 0] },
    Q: { ecPerBlock: 18, group1: [2, 15], group2: [2, 16] },
    H: { ecPerBlock: 22, group1: [2, 11], group2: [2, 12] },
  },
  6: {
    L: { ecPerBlock: 18, group1: [2, 68], group2: [0, 0] },
    M: { ecPerBlock: 16, group1: [4, 27], group2: [0, 0] },
    Q: { ecPerBlock: 24, group1: [4, 19], group2: [0, 0] },
    H: { ecPerBlock: 28, group1: [4, 15], group2: [0, 0] },
  },
  7: {
    L: { ecPerBlock: 20, group1: [2, 78], group2: [0, 0] },
    M: { ecPerBlock: 18, group1: [4, 31], group2: [0, 0] },
    Q: { ecPerBlock: 18, group1: [2, 14], group2: [4, 15] },
    H: { ecPerBlock: 26, group1: [4, 13], group2: [1, 14] },
  },
  8: {
    L: { ecPerBlock: 24, group1: [2, 97], group2: [0, 0] },
    M: { ecPerBlock: 22, group1: [2, 38], group2: [2, 39] },
    Q: { ecPerBlock: 22, group1: [4, 18], group2: [2, 19] },
    H: { ecPerBlock: 26, group1: [4, 14], group2: [2, 15] },
  },
  9: {
    L: { ecPerBlock: 30, group1: [2, 116], group2: [0, 0] },
    M: { ecPerBlock: 22, group1: [3, 36], group2: [2, 37] },
    Q: { ecPerBlock: 20, group1: [4, 16], group2: [4, 17] },
    H: { ecPerBlock: 24, group1: [4, 12], group2: [4, 13] },
  },
  10: {
    L: { ecPerBlock: 18, group1: [2, 68], group2: [2, 69] },
    M: { ecPerBlock: 26, group1: [4, 43], group2: [1, 44] },
    Q: { ecPerBlock: 24, group1: [6, 19], group2: [2, 20] },
    H: { ecPerBlock: 28, group1: [6, 15], group2: [2, 16] },
  },
}

/** Row/column centres of the alignment patterns, by version. */
const ALIGNMENT: Record<number, number[]> = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
  7: [6, 22, 38],
  8: [6, 24, 42],
  9: [6, 26, 46],
  10: [6, 28, 50],
}

export function dataCapacity(version: number, level: EcLevel): number {
  const spec = BLOCKS[version][level]
  return spec.group1[0] * spec.group1[1] + spec.group2[0] * spec.group2[1]
}

/** Byte-mode payload capacity, after the mode and character-count headers. */
export function byteCapacity(version: number, level: EcLevel): number {
  const headerBits = 4 + (version >= 10 ? 16 : 8)
  return Math.floor((dataCapacity(version, level) * 8 - headerBits) / 8)
}

// --- GF(256), primitive polynomial 0x11D ---

const EXP = new Uint8Array(512)
const LOG = new Uint8Array(256)
{
  let x = 1
  for (let i = 0; i < 255; i++) {
    EXP[i] = x
    LOG[x] = i
    x <<= 1
    if (x & 0x100) x ^= 0x11d
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]
}

const gfMul = (a: number, b: number) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]])

/** Generator polynomial for `degree` error-correction codewords. */
function generatorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1])
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1)
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j]
      next[j + 1] ^= gfMul(poly[j], EXP[i])
    }
    poly = next
  }
  return poly
}

export function reedSolomon(data: Uint8Array, ecCount: number): Uint8Array {
  const gen = generatorPoly(ecCount)
  const remainder = new Uint8Array(ecCount)
  for (const byte of data) {
    const factor = byte ^ remainder[0]
    remainder.copyWithin(0, 1)
    remainder[ecCount - 1] = 0
    for (let i = 0; i < ecCount; i++) remainder[i] ^= gfMul(gen[i + 1], factor)
  }
  return remainder
}

// --- BCH codes for the format and version information ---

export function formatBits(level: EcLevel, mask: number): number {
  const data = (EC_BITS[level] << 3) | mask
  let value = data << 10
  for (let i = 14; i >= 10; i--) {
    if (value & (1 << i)) value ^= 0b10100110111 << (i - 10)
  }
  return ((data << 10) | value) ^ 0b101010000010010
}

export function versionBits(version: number): number {
  let value = version << 12
  for (let i = 17; i >= 12; i--) {
    // BCH(18,6), generator x^12 + x^11 + x^10 + x^9 + x^8 + x^5 + x^2 + 1.
    if (value & (1 << i)) value ^= 0b1111100100101 << (i - 12)
  }
  return (version << 12) | value
}

// --- matrix ---

export interface QrMatrix {
  size: number
  modules: boolean[][]
  version: number
  level: EcLevel
  mask: number
}

const FINDER = [
  [1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 0, 1],
  [1, 0, 1, 1, 1, 0, 1],
  [1, 0, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1],
]

/**
 * Marks every module the data stream must skip: finders, separators, timing, alignment,
 * the dark module and the reserved format/version areas. Counting the modules this
 * leaves free is also how the tests confirm the block table above.
 */
export function functionModules(version: number): boolean[][] {
  const size = 17 + 4 * version
  const reserved = Array.from({ length: size }, () => new Array<boolean>(size).fill(false))
  const mark = (row: number, col: number) => {
    if (row >= 0 && row < size && col >= 0 && col < size) reserved[row][col] = true
  }

  // Finder patterns plus their one-module separators.
  for (const [baseRow, baseCol] of [[0, 0], [0, size - 7], [size - 7, 0]]) {
    for (let r = -1; r <= 7; r++) for (let c = -1; c <= 7; c++) mark(baseRow + r, baseCol + c)
  }
  // Timing patterns.
  for (let i = 0; i < size; i++) {
    mark(6, i)
    mark(i, 6)
  }
  // Alignment patterns, except where they would collide with a finder.
  const centres = ALIGNMENT[version]
  for (const row of centres) {
    for (const col of centres) {
      const nearFinder =
        (row <= 8 && col <= 8) || (row <= 8 && col >= size - 9) || (row >= size - 9 && col <= 8)
      if (nearFinder) continue
      for (let r = -2; r <= 2; r++) for (let c = -2; c <= 2; c++) mark(row + r, col + c)
    }
  }
  // Format information areas and the always-dark module.
  for (let i = 0; i < 9; i++) {
    mark(8, i)
    mark(i, 8)
  }
  for (let i = 0; i < 8; i++) {
    mark(8, size - 1 - i)
    mark(size - 8 + i, 8)
  }
  // Version information blocks.
  if (version >= 7) {
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 3; j++) {
        mark(i, size - 11 + j)
        mark(size - 11 + j, i)
      }
    }
  }
  return reserved
}

export function totalCodewords(version: number): number {
  const reserved = functionModules(version)
  const free = reserved.flat().filter((taken) => !taken).length
  return Math.floor(free / 8)
}

function drawFunctionPatterns(modules: boolean[][], version: number) {
  const size = modules.length
  for (const [baseRow, baseCol] of [[0, 0], [0, size - 7], [size - 7, 0]]) {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) modules[baseRow + r][baseCol + c] = FINDER[r][c] === 1
    }
  }
  for (let i = 8; i < size - 8; i++) {
    modules[6][i] = i % 2 === 0
    modules[i][6] = i % 2 === 0
  }
  const centres = ALIGNMENT[version]
  for (const row of centres) {
    for (const col of centres) {
      const nearFinder =
        (row <= 8 && col <= 8) || (row <= 8 && col >= size - 9) || (row >= size - 9 && col <= 8)
      if (nearFinder) continue
      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) {
          modules[row + r][col + c] = Math.max(Math.abs(r), Math.abs(c)) !== 1
        }
      }
    }
  }
  modules[size - 8][8] = true // the dark module
}

function drawFormatInfo(modules: boolean[][], level: EcLevel, mask: number) {
  const size = modules.length
  const bits = formatBits(level, mask)
  for (let i = 0; i < 15; i++) {
    const on = ((bits >> i) & 1) === 1
    // Copy one: down the left column and along the top row.
    if (i < 6) modules[i][8] = on
    else if (i === 6) modules[7][8] = on
    else if (i === 7) modules[8][8] = on
    else if (i === 8) modules[8][7] = on
    else modules[8][14 - i] = on
    // Copy two: seven modules up the bottom-left column, then eight along the top-right
    // row. The vertical run stops at seven — module (size-8, 8) is the always-dark one,
    // not a format bit, and writing eight here silently overwrites it.
    if (i < 7) modules[size - 1 - i][8] = on
    else modules[8][size - 15 + i] = on
  }
}

function drawVersionInfo(modules: boolean[][], version: number) {
  if (version < 7) return
  const size = modules.length
  const bits = versionBits(version)
  for (let i = 0; i < 18; i++) {
    const on = ((bits >> i) & 1) === 1
    const row = Math.floor(i / 3)
    const col = i % 3
    modules[row][size - 11 + col] = on
    modules[size - 11 + col][row] = on
  }
}

const MASKS: ((r: number, c: number) => boolean)[] = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (_r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
]

/** The four penalty rules from the spec; the mask with the lowest total wins. */
export function penalty(modules: boolean[][]): number {
  const size = modules.length
  let score = 0

  // Rule 1: runs of five or more identical modules.
  for (let i = 0; i < size; i++) {
    for (const readRow of [true, false]) {
      let run = 1
      for (let j = 1; j < size; j++) {
        const prev = readRow ? modules[i][j - 1] : modules[j - 1][i]
        const cur = readRow ? modules[i][j] : modules[j][i]
        if (cur === prev) {
          run++
        } else {
          if (run >= 5) score += run - 2
          run = 1
        }
      }
      if (run >= 5) score += run - 2
    }
  }

  // Rule 2: every 2×2 block of one colour.
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const v = modules[r][c]
      if (v === modules[r][c + 1] && v === modules[r + 1][c] && v === modules[r + 1][c + 1]) score += 3
    }
  }

  // Rule 3: the finder-like 1:1:3:1:1 pattern with four light modules beside it.
  const A = [true, false, true, true, true, false, true, false, false, false, false]
  const B = [false, false, false, false, true, false, true, true, true, false, true]
  const matches = (get: (k: number) => boolean, start: number, pattern: boolean[]) => {
    for (let k = 0; k < pattern.length; k++) if (get(start + k) !== pattern[k]) return false
    return true
  }
  for (let i = 0; i < size; i++) {
    for (let j = 0; j <= size - 11; j++) {
      const row = (k: number) => modules[i][k]
      const col = (k: number) => modules[k][i]
      if (matches(row, j, A) || matches(row, j, B)) score += 40
      if (matches(col, j, A) || matches(col, j, B)) score += 40
    }
  }

  // Rule 4: deviation of the dark-module share from 50%.
  const dark = modules.flat().filter(Boolean).length
  const percent = (dark * 100) / (size * size)
  score += Math.floor(Math.abs(percent - 50) / 5) * 10

  return score
}

function buildBitstream(bytes: Uint8Array, version: number, level: EcLevel): Uint8Array {
  const capacity = dataCapacity(version, level)
  const bits: number[] = []
  const push = (value: number, count: number) => {
    for (let i = count - 1; i >= 0; i--) bits.push((value >> i) & 1)
  }

  push(0b0100, 4) // byte mode
  push(bytes.length, version >= 10 ? 16 : 8)
  for (const byte of bytes) push(byte, 8)

  // Terminator, then pad to a byte boundary, then the alternating pad bytes.
  const totalBits = capacity * 8
  push(0, Math.min(4, totalBits - bits.length))
  while (bits.length % 8 !== 0) bits.push(0)

  const data = new Uint8Array(capacity)
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j]
    data[i / 8] = byte
  }
  for (let i = bits.length / 8, pad = 0; i < capacity; i++, pad++) {
    data[i] = pad % 2 === 0 ? 0xec : 0x11
  }
  return data
}

/** Splits into blocks, appends error correction, then interleaves as the spec requires. */
function interleave(data: Uint8Array, version: number, level: EcLevel): Uint8Array {
  const spec = BLOCKS[version][level]
  const blocks: Uint8Array[] = []
  const ecBlocks: Uint8Array[] = []

  let offset = 0
  for (const [count, size] of [spec.group1, spec.group2]) {
    for (let i = 0; i < count; i++) {
      const block = data.subarray(offset, offset + size)
      offset += size
      blocks.push(block)
      ecBlocks.push(reedSolomon(block, spec.ecPerBlock))
    }
  }

  const out: number[] = []
  const maxData = Math.max(...blocks.map((b) => b.length))
  for (let i = 0; i < maxData; i++) {
    for (const block of blocks) if (i < block.length) out.push(block[i])
  }
  for (let i = 0; i < spec.ecPerBlock; i++) {
    for (const block of ecBlocks) out.push(block[i])
  }
  return new Uint8Array(out)
}

export class QrTooLong extends Error {}

export function smallestVersion(byteLength: number, level: EcLevel): number {
  for (let version = 1; version <= MAX_VERSION; version++) {
    if (byteLength <= byteCapacity(version, level)) return version
  }
  throw new QrTooLong(String(byteLength))
}

export function encodeQr(text: string, level: EcLevel = 'M'): QrMatrix {
  const bytes = new TextEncoder().encode(text)
  const version = smallestVersion(bytes.length, level)
  const size = 17 + 4 * version
  const codewords = interleave(buildBitstream(bytes, version, level), version, level)
  const reserved = functionModules(version)

  const base = Array.from({ length: size }, () => new Array<boolean>(size).fill(false))
  drawFunctionPatterns(base, version)
  drawVersionInfo(base, version)

  // Zigzag placement: two-module-wide columns walked right to left, alternating up and
  // down. Column 6 is the vertical timing pattern, and the walk has to shift past it
  // rather than skip a pair — moving the cursor itself, or the remaining pairs land
  // off-by-one and overlap. Tests assert this covers every free module exactly once.
  let bit = 0
  const placed = base.map((row) => [...row])
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5
    const upward = ((right + 1) & 2) === 0
    for (let vert = 0; vert < size; vert++) {
      const row = upward ? size - 1 - vert : vert
      for (const c of [right, right - 1]) {
        if (reserved[row][c]) continue
        const byte = codewords[bit >> 3]
        placed[row][c] = byte !== undefined && ((byte >> (7 - (bit & 7))) & 1) === 1
        bit++
      }
    }
  }

  let best: QrMatrix | null = null
  let bestScore = Infinity
  for (let mask = 0; mask < 8; mask++) {
    const modules = placed.map((row, r) =>
      row.map((on, c) => (reserved[r][c] ? on : on !== MASKS[mask](r, c))),
    )
    drawFormatInfo(modules, level, mask)
    const score = penalty(modules)
    if (score < bestScore) {
      bestScore = score
      best = { size, modules, version, level, mask }
    }
  }
  return best!
}

/** Renders the matrix as a standalone SVG with the required 4-module quiet zone. */
export function toSvg(qr: QrMatrix, moduleSize = 8, quietZone = 4): string {
  const total = (qr.size + quietZone * 2) * moduleSize
  const paths: string[] = []
  for (let r = 0; r < qr.size; r++) {
    for (let c = 0; c < qr.size; c++) {
      if (!qr.modules[r][c]) continue
      paths.push(`M${(c + quietZone) * moduleSize} ${(r + quietZone) * moduleSize}h${moduleSize}v${moduleSize}h-${moduleSize}z`)
    }
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="${total}" viewBox="0 0 ${total} ${total}">` +
    `<rect width="${total}" height="${total}" fill="#ffffff"/>` +
    `<path d="${paths.join('')}" fill="#000000"/>` +
    `</svg>`
  )
}
