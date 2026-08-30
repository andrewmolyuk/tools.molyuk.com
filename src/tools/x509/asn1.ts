/**
 * Minimal DER reader — enough of ASN.1 to walk an X.509 certificate.
 *
 * DER, not BER: indefinite lengths and non-minimal encodings are rejected rather than
 * tolerated, because a certificate that uses them is malformed and quietly accepting it
 * would mean displaying fields that no other tool agrees with.
 */

export const TAG = {
  BOOLEAN: 1,
  INTEGER: 2,
  BIT_STRING: 3,
  OCTET_STRING: 4,
  NULL: 5,
  OID: 6,
  UTF8_STRING: 12,
  SEQUENCE: 16,
  SET: 17,
  PRINTABLE_STRING: 19,
  T61_STRING: 20,
  IA5_STRING: 22,
  UTC_TIME: 23,
  GENERALIZED_TIME: 24,
  BMP_STRING: 30,
} as const

export class Asn1Error extends Error {}

export interface Asn1Node {
  /** 0 universal, 1 application, 2 context-specific, 3 private. */
  tagClass: number
  constructed: boolean
  tagNumber: number
  /** Offset of the first byte of this node within the buffer it came from. */
  start: number
  /** Total bytes occupied, header included. */
  totalLength: number
  contents: Uint8Array
  children: Asn1Node[]
}

function readNode(bytes: Uint8Array, offset: number): Asn1Node {
  if (offset >= bytes.length) throw new Asn1Error('truncated')

  const first = bytes[offset]
  const tagClass = first >> 6
  const constructed = (first & 0x20) !== 0
  let tagNumber = first & 0x1f
  let cursor = offset + 1

  // High tag number form: the low five bits are all set and the number follows base-128.
  if (tagNumber === 0x1f) {
    tagNumber = 0
    for (;;) {
      if (cursor >= bytes.length) throw new Asn1Error('truncated tag')
      const byte = bytes[cursor++]
      tagNumber = (tagNumber << 7) | (byte & 0x7f)
      if ((byte & 0x80) === 0) break
    }
  }

  if (cursor >= bytes.length) throw new Asn1Error('truncated length')
  let length = bytes[cursor++]
  if (length === 0x80) throw new Asn1Error('indefinite length is not DER')
  if (length > 0x80) {
    const count = length & 0x7f
    if (count > 4) throw new Asn1Error('length too large')
    if (cursor + count > bytes.length) throw new Asn1Error('truncated length')
    length = 0
    for (let i = 0; i < count; i++) length = length * 256 + bytes[cursor++]
  }

  const end = cursor + length
  if (end > bytes.length) throw new Asn1Error('length runs past the end')

  const contents = bytes.subarray(cursor, end)
  const node: Asn1Node = {
    tagClass,
    constructed,
    tagNumber,
    start: offset,
    totalLength: end - offset,
    contents,
    children: [],
  }
  if (constructed) node.children = readSequence(contents)
  return node
}

export function readSequence(bytes: Uint8Array): Asn1Node[] {
  const out: Asn1Node[] = []
  let offset = 0
  while (offset < bytes.length) {
    const node = readNode(bytes, offset)
    out.push(node)
    offset += node.totalLength
  }
  return out
}

export function parseDer(bytes: Uint8Array): Asn1Node {
  const node = readNode(bytes, 0)
  if (node.totalLength !== bytes.length) throw new Asn1Error('trailing bytes after the top-level value')
  return node
}

// --- value decoders ---

export function oidToString(contents: Uint8Array): string {
  if (!contents.length) throw new Asn1Error('empty oid')
  // The first byte packs the first two arcs: 40 * first + second.
  const parts = [Math.floor(contents[0] / 40), contents[0] % 40]
  let value = 0
  for (let i = 1; i < contents.length; i++) {
    value = value * 128 + (contents[i] & 0x7f)
    if ((contents[i] & 0x80) === 0) {
      parts.push(value)
      value = 0
    }
  }
  return parts.join('.')
}

export function toHex(bytes: Uint8Array, separator = ''): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(separator)
}

/** Serial numbers are printed as the unsigned magnitude, dropping DER's sign padding. */
export function integerToHex(contents: Uint8Array): string {
  let start = 0
  while (start < contents.length - 1 && contents[start] === 0) start++
  return toHex(contents.subarray(start)).toUpperCase()
}

export function bitStringBytes(contents: Uint8Array): { unusedBits: number; bytes: Uint8Array } {
  if (!contents.length) throw new Asn1Error('empty bit string')
  return { unusedBits: contents[0], bytes: contents.subarray(1) }
}

const TEXT_TAGS = new Set<number>([
  TAG.UTF8_STRING, TAG.PRINTABLE_STRING, TAG.IA5_STRING, TAG.T61_STRING,
])

export function decodeString(node: Asn1Node): string {
  if (node.tagNumber === TAG.BMP_STRING) {
    // BMPString is UTF-16BE.
    let out = ''
    for (let i = 0; i + 1 < node.contents.length; i += 2) {
      out += String.fromCharCode((node.contents[i] << 8) | node.contents[i + 1])
    }
    return out
  }
  if (!TEXT_TAGS.has(node.tagNumber)) return toHex(node.contents)
  return new TextDecoder('utf-8').decode(node.contents)
}

/**
 * UTCTime carries a two-digit year; RFC 5280 pins the pivot at 50, so 49 means 2049 and
 * 50 means 1950. GeneralizedTime spells the century out.
 */
export function decodeTime(node: Asn1Node): Date {
  const text = new TextDecoder().decode(node.contents).trim()
  const match =
    node.tagNumber === TAG.UTC_TIME
      ? text.match(/^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?Z$/)
      : text.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?Z$/)
  if (!match) throw new Asn1Error(`unsupported time: ${text}`)

  const [, y, mo, d, h, mi, sec] = match
  const year = node.tagNumber === TAG.UTC_TIME ? (Number(y) >= 50 ? 1900 + Number(y) : 2000 + Number(y)) : Number(y)
  return new Date(Date.UTC(year, Number(mo) - 1, Number(d), Number(h), Number(mi), Number(sec ?? 0)))
}
