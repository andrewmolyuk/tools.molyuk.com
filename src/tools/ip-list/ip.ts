import { t } from '../../i18n'

export const MAX_RANGE = 65536
export const MAX_RANDOM = 10000

export function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min
  return Math.min(Math.max(Math.trunc(n), min), max)
}

// --- IPv4 ---

export function ipv4ToInt(ip: string): number {
  const parts = ip.trim().split('.')
  if (parts.length !== 4) throw new Error(t('errors.invalidIpv4'))
  let result = 0
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) throw new Error(t('errors.invalidIpv4'))
    const n = Number(part)
    if (n > 255) throw new Error(t('errors.invalidIpv4'))
    result = (result << 8) | n
  }
  return result >>> 0
}

export function intToIpv4(n: number): string {
  return [24, 16, 8, 0].map((shift) => (n >>> shift) & 255).join('.')
}

export function parseIPv4Cidr(cidr: string): { base: number; size: number } {
  const [ipPart, prefixPart] = cidr.trim().split('/')
  if (!ipPart) throw new Error(t('errors.enterCidr4'))
  const prefix = prefixPart === undefined ? 32 : Number(prefixPart)
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    throw new Error(t('errors.prefixRange4'))
  }
  const ip = ipv4ToInt(ipPart)
  const size = 2 ** (32 - prefix)
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0
  const base = (ip & mask) >>> 0
  return { base, size }
}

// --- IPv6 ---

function expandIPv6Hextets(ip: string): string[] {
  const trimmed = ip.trim()
  if (trimmed.includes(':::') || (trimmed.match(/::/g) ?? []).length > 1) {
    throw new Error(t('errors.invalidIpv6'))
  }
  let left: string[]
  let right: string[]
  if (trimmed.includes('::')) {
    const [leftStr, rightStr] = trimmed.split('::')
    left = leftStr ? leftStr.split(':') : []
    right = rightStr ? rightStr.split(':') : []
  } else {
    left = trimmed.split(':')
    right = []
  }
  const missing = 8 - left.length - right.length
  if (missing < 0) throw new Error(t('errors.invalidIpv6'))
  const hextets = [...left, ...Array(missing).fill('0'), ...right]
  if (hextets.length !== 8 || hextets.some((h) => !/^[0-9a-fA-F]{1,4}$/.test(h))) {
    throw new Error(t('errors.invalidIpv6'))
  }
  return hextets
}

export function ipv6ToBigInt(ip: string): bigint {
  return expandIPv6Hextets(ip).reduce((acc, h) => (acc << 16n) | BigInt(parseInt(h, 16)), 0n)
}

function compressIPv6(hextets: string[]): string {
  let bestStart = -1
  let bestLen = 0
  let curStart = -1
  let curLen = 0
  for (let i = 0; i < hextets.length; i++) {
    if (hextets[i] === '0') {
      if (curStart === -1) curStart = i
      curLen++
      if (curLen > bestLen) {
        bestLen = curLen
        bestStart = curStart
      }
    } else {
      curStart = -1
      curLen = 0
    }
  }
  if (bestLen > 1) {
    const before = hextets.slice(0, bestStart).join(':')
    const after = hextets.slice(bestStart + bestLen).join(':')
    return `${before}::${after}`
  }
  return hextets.join(':')
}

export function bigIntToIPv6(n: bigint): string {
  const hextets: string[] = []
  for (let i = 7; i >= 0; i--) {
    hextets.push(((n >> BigInt(i * 16)) & 0xffffn).toString(16))
  }
  return compressIPv6(hextets)
}

export function parseIPv6Cidr(cidr: string): { base: bigint; prefix: number } {
  const [ipPart, prefixPart] = cidr.trim().split('/')
  if (!ipPart) throw new Error(t('errors.enterCidr6'))
  const prefix = prefixPart === undefined ? 128 : Number(prefixPart)
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 128) {
    throw new Error(t('errors.prefixRange6'))
  }
  const ip = ipv6ToBigInt(ipPart)
  const hostBits = BigInt(128 - prefix)
  const fullMask = (1n << 128n) - 1n
  const mask = hostBits === 0n ? fullMask : (fullMask << hostBits) & fullMask
  return { base: ip & mask, prefix }
}

export function randomBigInt(bits: bigint): bigint {
  let result = 0n
  let remaining = bits
  while (remaining > 0n) {
    const chunk = remaining > 30n ? 30n : remaining
    const rand = Math.floor(Math.random() * 2 ** Number(chunk))
    result = (result << chunk) | BigInt(rand)
    remaining -= chunk
  }
  return result
}
