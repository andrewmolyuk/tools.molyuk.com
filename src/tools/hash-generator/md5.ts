/**
 * MD5 (RFC 1321). Web Crypto deliberately omits it, but checksums published by
 * mirrors, package registries and legacy APIs still use it, so the tool would have a
 * hole without it. Not for anything security-bearing — MD5 collisions are trivial to
 * produce; the UI says so.
 */

const S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
]

// K[i] = floor(2^32 * abs(sin(i + 1))), precomputed per the RFC.
const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32))

function rotl(x: number, c: number): number {
  return (x << c) | (x >>> (32 - c))
}

export function md5(bytes: Uint8Array): string {
  // Pad to a multiple of 64 bytes: a 0x80 byte, zeros, then the bit length as LE u64.
  const bitLength = bytes.length * 8
  const paddedLength = (((bytes.length + 8) >> 6) + 1) << 6
  const buffer = new Uint8Array(paddedLength)
  buffer.set(bytes)
  buffer[bytes.length] = 0x80
  const view = new DataView(buffer.buffer)
  // Lengths above 2^32 bits cannot occur here — the input is a browser string.
  view.setUint32(paddedLength - 8, bitLength >>> 0, true)
  view.setUint32(paddedLength - 4, Math.floor(bitLength / 2 ** 32), true)

  let a0 = 0x67452301
  let b0 = 0xefcdab89
  let c0 = 0x98badcfe
  let d0 = 0x10325476

  const M = new Uint32Array(16)
  for (let chunk = 0; chunk < paddedLength; chunk += 64) {
    for (let i = 0; i < 16; i++) M[i] = view.getUint32(chunk + i * 4, true)

    let a = a0
    let b = b0
    let c = c0
    let d = d0

    for (let i = 0; i < 64; i++) {
      let f: number
      let g: number
      if (i < 16) {
        f = (b & c) | (~b & d)
        g = i
      } else if (i < 32) {
        f = (d & b) | (~d & c)
        g = (5 * i + 1) % 16
      } else if (i < 48) {
        f = b ^ c ^ d
        g = (3 * i + 5) % 16
      } else {
        f = c ^ (b | ~d)
        g = (7 * i) % 16
      }
      const tmp = d
      d = c
      c = b
      b = (b + rotl((a + f + K[i] + M[g]) | 0, S[i])) | 0
      a = tmp
    }

    a0 = (a0 + a) | 0
    b0 = (b0 + b) | 0
    c0 = (c0 + c) | 0
    d0 = (d0 + d) | 0
  }

  const out = new DataView(new ArrayBuffer(16))
  out.setUint32(0, a0 >>> 0, true)
  out.setUint32(4, b0 >>> 0, true)
  out.setUint32(8, c0 >>> 0, true)
  out.setUint32(12, d0 >>> 0, true)
  return Array.from(new Uint8Array(out.buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}
