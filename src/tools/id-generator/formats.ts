/**
 * ID formats beyond UUID v4. Both are short specs, so they live here rather than
 * pulling in a dependency — and both draw from crypto.getRandomValues, never Math.random.
 */

/** Crockford base32: no I, L, O or U, so the text survives being read aloud or retyped. */
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

/** The standard nanoid alphabet (64 URL-safe characters). */
const NANOID_ALPHABET = 'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict'

export const NANOID_DEFAULT_SIZE = 21

function randomBytes(n: number): Uint8Array {
  const bytes = new Uint8Array(n)
  crypto.getRandomValues(bytes)
  return bytes
}

/**
 * ULID: 48-bit millisecond timestamp then 80 random bits, both in Crockford base32.
 * The timestamp prefix is why ULIDs sort lexicographically in creation order.
 */
export function ulid(now = Date.now()): string {
  let time = ''
  let remaining = now
  for (let i = 0; i < 10; i++) {
    time = CROCKFORD[remaining % 32] + time
    remaining = Math.floor(remaining / 32)
  }

  // 16 characters × 5 bits = 80 bits of randomness, one byte drawn per character and
  // reduced to 5 bits. Taking the low 5 bits of a uniform byte stays uniform because
  // 256 is a multiple of 32 — no modulo bias.
  const bytes = randomBytes(16)
  let random = ''
  for (const byte of bytes) random += CROCKFORD[byte & 31]

  return time + random
}

/**
 * nanoid: uniform draws from a 64-character alphabet. 64 divides 256 evenly, so masking
 * a random byte to 6 bits is unbiased and no rejection loop is needed.
 */
export function nanoid(size = NANOID_DEFAULT_SIZE): string {
  const bytes = randomBytes(size)
  let out = ''
  for (const byte of bytes) out += NANOID_ALPHABET[byte & 63]
  return out
}

/** Bits of randomness in each format, for the entropy readout. */
export const RANDOM_BITS = {
  uuid: 122, // v4 fixes 6 of the 128 bits for version and variant
  ulid: 80,
  nanoid: (size: number) => size * 6,
}
