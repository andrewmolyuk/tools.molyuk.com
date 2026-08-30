/**
 * TOTP (RFC 6238) over HOTP (RFC 4226).
 *
 * The code is a truncation of an HMAC over a time counter, so Web Crypto does the
 * cryptography and the only work here is the counter, the base32 secret and the
 * dynamic-truncation step. RFC 6238 publishes test vectors for all three hash
 * functions, which is what the tests check against.
 */

export type TotpAlgorithm = 'SHA-1' | 'SHA-256' | 'SHA-512'

export interface TotpOptions {
  digits: number
  period: number
  algorithm: TotpAlgorithm
}

export const DEFAULTS: TotpOptions = { digits: 6, period: 30, algorithm: 'SHA-1' }

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export class Base32Error extends Error {}

/**
 * RFC 4648 base32. Authenticator secrets are copied by hand off screens, so spaces and
 * lower case are tolerated; a character outside the alphabet is not, because silently
 * dropping it would produce a plausible-looking wrong code.
 */
export function base32Decode(input: string): Uint8Array {
  const clean = input.replace(/[\s-]/g, '').replace(/=+$/, '').toUpperCase()
  if (!clean) return new Uint8Array(0)

  let bits = 0
  let value = 0
  const out: number[] = []
  for (const char of clean) {
    const index = BASE32.indexOf(char)
    if (index < 0) throw new Base32Error(char)
    value = (value << 5) | index
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return new Uint8Array(out)
}

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0
  let value = 0
  let out = ''
  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31]
  return out
}

/** The moving factor: how many whole periods have elapsed since the Unix epoch. */
export function counterFor(epochSeconds: number, period: number): number {
  return Math.floor(epochSeconds / period)
}

function counterBytes(counter: number): Uint8Array {
  const buffer = new ArrayBuffer(8)
  const view = new DataView(buffer)
  // 64-bit big-endian; the high word stays meaningful past 2^32 periods.
  view.setUint32(0, Math.floor(counter / 2 ** 32))
  view.setUint32(4, counter >>> 0)
  return new Uint8Array(buffer)
}

export async function hotp(secret: Uint8Array, counter: number, options: TotpOptions): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    secret as unknown as BufferSource,
    { name: 'HMAC', hash: options.algorithm },
    false,
    ['sign'],
  )
  const mac = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, counterBytes(counter) as unknown as BufferSource),
  )

  // Dynamic truncation (RFC 4226 §5.3): the low nibble of the last byte picks the offset.
  const offset = mac[mac.length - 1] & 0x0f
  const binary =
    ((mac[offset] & 0x7f) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3]

  return String(binary % 10 ** options.digits).padStart(options.digits, '0')
}

export async function totp(
  secret: Uint8Array,
  epochSeconds: number,
  options: TotpOptions,
): Promise<string> {
  return hotp(secret, counterFor(epochSeconds, options.period), options)
}

export function secondsRemaining(epochSeconds: number, period: number): number {
  return period - (Math.floor(epochSeconds) % period)
}

// --- otpauth:// URIs ---

export interface OtpAuthUri {
  secret: string
  issuer: string | null
  account: string | null
  options: TotpOptions
}

const URI_ALGORITHMS: Record<string, TotpAlgorithm> = {
  SHA1: 'SHA-1',
  SHA256: 'SHA-256',
  SHA512: 'SHA-512',
}

/** Parses the otpauth:// URI an authenticator QR code encodes. */
export function parseOtpAuth(text: string): OtpAuthUri | null {
  let url: URL
  try {
    url = new URL(text.trim())
  } catch {
    return null
  }
  if (url.protocol !== 'otpauth:' || url.host.toLowerCase() !== 'totp') return null

  const secret = url.searchParams.get('secret')
  if (!secret) return null

  // The label is "Issuer:account", and the issuer parameter wins when both are present.
  const label = decodeURIComponent(url.pathname.replace(/^\/+/, ''))
  const [labelIssuer, labelAccount] = label.includes(':') ? label.split(/:(.+)/) : [null, label]

  const digits = Number(url.searchParams.get('digits') ?? DEFAULTS.digits)
  const period = Number(url.searchParams.get('period') ?? DEFAULTS.period)
  const algorithm = URI_ALGORITHMS[(url.searchParams.get('algorithm') ?? 'SHA1').toUpperCase()]

  return {
    secret,
    issuer: url.searchParams.get('issuer') ?? labelIssuer ?? null,
    account: labelAccount || null,
    options: {
      digits: Number.isInteger(digits) && digits >= 6 && digits <= 10 ? digits : DEFAULTS.digits,
      period: Number.isInteger(period) && period > 0 ? period : DEFAULTS.period,
      algorithm: algorithm ?? DEFAULTS.algorithm,
    },
  }
}

export function buildOtpAuth(secret: string, issuer: string, account: string, options: TotpOptions): string {
  const label = issuer ? `${issuer}:${account || 'user'}` : account || 'user'
  const params = new URLSearchParams({ secret })
  if (issuer) params.set('issuer', issuer)
  if (options.algorithm !== DEFAULTS.algorithm) {
    params.set('algorithm', options.algorithm.replace('-', ''))
  }
  if (options.digits !== DEFAULTS.digits) params.set('digits', String(options.digits))
  if (options.period !== DEFAULTS.period) params.set('period', String(options.period))
  return `otpauth://totp/${encodeURIComponent(label)}?${params}`
}
