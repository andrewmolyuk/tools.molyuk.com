/**
 * X.509 certificate decoding (RFC 5280).
 *
 * Reads the fields people actually open a certificate to check: who it is for, who
 * signed it, when it stops working, and which names it covers. Everything is decoded
 * from the DER here rather than handed to any platform API, so a malformed or expired
 * certificate can still be inspected — which is usually exactly when you need to.
 */

import {
  type Asn1Node, Asn1Error, TAG, bitStringBytes, decodeString, decodeTime,
  integerToHex, oidToString, parseDer, readSequence, toHex,
} from './asn1'

export { Asn1Error }

const ATTRIBUTE_NAMES: Record<string, string> = {
  '2.5.4.3': 'CN',
  '2.5.4.5': 'serialNumber',
  '2.5.4.6': 'C',
  '2.5.4.7': 'L',
  '2.5.4.8': 'ST',
  '2.5.4.9': 'street',
  '2.5.4.10': 'O',
  '2.5.4.11': 'OU',
  '2.5.4.12': 'title',
  '2.5.4.15': 'businessCategory',
  '2.5.4.17': 'postalCode',
  '1.2.840.113549.1.9.1': 'emailAddress',
  '0.9.2342.19200300.100.1.25': 'DC',
  '1.3.6.1.4.1.311.60.2.1.3': 'jurisdictionC',
}

const SIGNATURE_NAMES: Record<string, string> = {
  '1.2.840.113549.1.1.5': 'sha1WithRSAEncryption',
  '1.2.840.113549.1.1.11': 'sha256WithRSAEncryption',
  '1.2.840.113549.1.1.12': 'sha384WithRSAEncryption',
  '1.2.840.113549.1.1.13': 'sha512WithRSAEncryption',
  '1.2.840.113549.1.1.10': 'RSASSA-PSS',
  '1.2.840.10045.4.3.2': 'ecdsa-with-SHA256',
  '1.2.840.10045.4.3.3': 'ecdsa-with-SHA384',
  '1.2.840.10045.4.3.4': 'ecdsa-with-SHA512',
  '1.3.101.112': 'Ed25519',
}

const KEY_NAMES: Record<string, string> = {
  '1.2.840.113549.1.1.1': 'RSA',
  '1.2.840.10045.2.1': 'EC',
  '1.3.101.112': 'Ed25519',
  '1.3.101.113': 'Ed448',
}

const CURVE_NAMES: Record<string, string> = {
  '1.2.840.10045.3.1.7': 'P-256 (prime256v1)',
  '1.3.132.0.34': 'P-384 (secp384r1)',
  '1.3.132.0.35': 'P-521 (secp521r1)',
  '1.3.132.0.10': 'secp256k1',
}

const EXT_NAMES: Record<string, string> = {
  '2.5.29.14': 'subjectKeyIdentifier',
  '2.5.29.15': 'keyUsage',
  '2.5.29.17': 'subjectAltName',
  '2.5.29.19': 'basicConstraints',
  '2.5.29.31': 'cRLDistributionPoints',
  '2.5.29.32': 'certificatePolicies',
  '2.5.29.35': 'authorityKeyIdentifier',
  '2.5.29.37': 'extKeyUsage',
  '1.3.6.1.5.5.7.1.1': 'authorityInfoAccess',
  '1.3.6.1.4.1.11129.2.4.2': 'signedCertificateTimestamps',
}

const EXT_KEY_USAGE_NAMES: Record<string, string> = {
  '1.3.6.1.5.5.7.3.1': 'serverAuth',
  '1.3.6.1.5.5.7.3.2': 'clientAuth',
  '1.3.6.1.5.5.7.3.3': 'codeSigning',
  '1.3.6.1.5.5.7.3.4': 'emailProtection',
  '1.3.6.1.5.5.7.3.8': 'timeStamping',
  '1.3.6.1.5.5.7.3.9': 'OCSPSigning',
}

/** Bit positions in the KeyUsage BIT STRING, most significant bit first. */
const KEY_USAGE_BITS = [
  'digitalSignature', 'nonRepudiation', 'keyEncipherment', 'dataEncipherment',
  'keyAgreement', 'keyCertSign', 'cRLSign', 'encipherOnly', 'decipherOnly',
]

export interface NamePart {
  key: string
  value: string
}

export interface Extension {
  oid: string
  name: string
  critical: boolean
  /** Rendered value for the extensions this tool understands. */
  value: string | null
}

export interface Certificate {
  version: number
  serialNumber: string
  signatureAlgorithm: string
  issuer: NamePart[]
  subject: NamePart[]
  notBefore: Date
  notAfter: Date
  publicKey: { algorithm: string; size: number | null; curve: string | null }
  extensions: Extension[]
  subjectAltNames: string[]
  isCa: boolean
  der: Uint8Array
}

export function pemToDer(input: string): Uint8Array {
  const text = input.trim()
  const body = text.includes('-----BEGIN')
    ? text.replace(/-----BEGIN [^-]+-----/g, '').replace(/-----END [^-]+-----/g, '').replace(/\s+/g, '')
    : text.replace(/\s+/g, '')
  if (!body || !/^[A-Za-z0-9+/]+=*$/.test(body)) throw new Asn1Error('not base64')
  const binary = atob(body)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export function formatName(parts: NamePart[]): string {
  return parts.map((part) => `${part.key}=${part.value}`).join(', ')
}

function parseName(node: Asn1Node): NamePart[] {
  const out: NamePart[] = []
  for (const rdn of node.children) {
    for (const attribute of rdn.children) {
      const [typeNode, valueNode] = attribute.children
      if (!typeNode || !valueNode) continue
      const oid = oidToString(typeNode.contents)
      out.push({ key: ATTRIBUTE_NAMES[oid] ?? oid, value: decodeString(valueNode) })
    }
  }
  return out
}

/** GeneralName is a CHOICE of context-specific tags; these are the ones that name a peer. */
function parseGeneralNames(node: Asn1Node): string[] {
  return node.children.map((entry) => {
    switch (entry.tagNumber) {
      case 1:
        return `email:${new TextDecoder().decode(entry.contents)}`
      case 2:
        return `DNS:${new TextDecoder().decode(entry.contents)}`
      case 6:
        return `URI:${new TextDecoder().decode(entry.contents)}`
      case 7: {
        const bytes = entry.contents
        // 4 bytes is IPv4, 16 is IPv6; anything else is not an address.
        if (bytes.length === 4) return `IP:${Array.from(bytes).join('.')}`
        if (bytes.length === 16) {
          const groups: string[] = []
          for (let i = 0; i < 16; i += 2) groups.push(((bytes[i] << 8) | bytes[i + 1]).toString(16))
          return `IP:${groups.join(':')}`
        }
        return `IP:${toHex(bytes)}`
      }
      default:
        return `[${entry.tagNumber}]:${toHex(entry.contents)}`
    }
  })
}

function renderExtension(oid: string, contents: Uint8Array): string | null {
  try {
    switch (oid) {
      case '2.5.29.17':
        return parseGeneralNames(parseDer(contents)).join(', ')
      case '2.5.29.19': {
        const seq = parseDer(contents)
        const ca = seq.children.find((c) => c.tagNumber === TAG.BOOLEAN)
        const pathLen = seq.children.find((c) => c.tagNumber === TAG.INTEGER)
        const isCa = Boolean(ca && ca.contents[0] !== 0)
        return `CA:${isCa ? 'TRUE' : 'FALSE'}${pathLen ? `, pathlen:${pathLen.contents[0]}` : ''}`
      }
      case '2.5.29.15': {
        const { unusedBits, bytes } = bitStringBytes(parseDer(contents).contents)
        const total = bytes.length * 8 - unusedBits
        const set: string[] = []
        for (let i = 0; i < total && i < KEY_USAGE_BITS.length; i++) {
          if (bytes[i >> 3] & (0x80 >> i % 8)) set.push(KEY_USAGE_BITS[i])
        }
        return set.join(', ')
      }
      case '2.5.29.37':
        return parseDer(contents)
          .children.map((c) => {
            const value = oidToString(c.contents)
            return EXT_KEY_USAGE_NAMES[value] ?? value
          })
          .join(', ')
      case '2.5.29.14':
        return toHex(parseDer(contents).contents, ':').toUpperCase()
      case '2.5.29.35': {
        const keyId = parseDer(contents).children.find((c) => c.tagNumber === 0)
        return keyId ? toHex(keyId.contents, ':').toUpperCase() : null
      }
      default:
        return null
    }
  } catch {
    return null
  }
}

export function parseCertificate(input: string): Certificate {
  const der = pemToDer(input)
  const root = parseDer(der)
  if (root.tagNumber !== TAG.SEQUENCE) throw new Asn1Error('not a certificate')

  const [tbs, signatureAlg] = root.children
  if (!tbs || !signatureAlg) throw new Asn1Error('not a certificate')

  let index = 0
  // Version is [0] EXPLICIT and defaults to v1 when absent.
  let version = 1
  if (tbs.children[0]?.tagClass === 2 && tbs.children[0].tagNumber === 0) {
    version = (tbs.children[0].children[0]?.contents[0] ?? 0) + 1
    index = 1
  }

  const serialNode = tbs.children[index++]
  index++ // inner signature AlgorithmIdentifier, repeated from the outer one
  const issuerNode = tbs.children[index++]
  const validityNode = tbs.children[index++]
  const subjectNode = tbs.children[index++]
  const spkiNode = tbs.children[index++]
  if (!serialNode || !issuerNode || !validityNode || !subjectNode || !spkiNode) {
    throw new Asn1Error('truncated certificate body')
  }

  const [algIdNode, keyBitsNode] = spkiNode.children
  const keyOid = oidToString(algIdNode.children[0].contents)
  const keyAlgorithm = KEY_NAMES[keyOid] ?? keyOid

  let size: number | null = null
  let curve: string | null = null
  if (keyAlgorithm === 'RSA') {
    const modulus = parseDer(bitStringBytes(keyBitsNode.contents).bytes).children[0]
    let start = 0
    while (start < modulus.contents.length && modulus.contents[start] === 0) start++
    size = (modulus.contents.length - start) * 8
  } else if (keyAlgorithm === 'EC') {
    const curveOid = algIdNode.children[1] ? oidToString(algIdNode.children[1].contents) : null
    curve = curveOid ? (CURVE_NAMES[curveOid] ?? curveOid) : null
    size = (bitStringBytes(keyBitsNode.contents).bytes.length - 1) * 4
  }

  const extensionsNode = tbs.children.find((child) => child.tagClass === 2 && child.tagNumber === 3)
  const extensions: Extension[] = []
  if (extensionsNode?.children[0]) {
    for (const entry of extensionsNode.children[0].children) {
      const oid = oidToString(entry.children[0].contents)
      const critical = entry.children[1]?.tagNumber === TAG.BOOLEAN && entry.children[1].contents[0] !== 0
      const valueNode = entry.children[entry.children.length - 1]
      extensions.push({
        oid,
        name: EXT_NAMES[oid] ?? oid,
        critical,
        value: renderExtension(oid, valueNode.contents),
      })
    }
  }

  const san = extensions.find((e) => e.oid === '2.5.29.17')
  const basic = extensions.find((e) => e.oid === '2.5.29.19')

  const sigOid = oidToString(signatureAlg.children[0].contents)

  return {
    version,
    serialNumber: integerToHex(serialNode.contents),
    signatureAlgorithm: SIGNATURE_NAMES[sigOid] ?? sigOid,
    issuer: parseName(issuerNode),
    subject: parseName(subjectNode),
    notBefore: decodeTime(validityNode.children[0]),
    notAfter: decodeTime(validityNode.children[1]),
    publicKey: { algorithm: keyAlgorithm, size, curve },
    extensions,
    subjectAltNames: san?.value ? san.value.split(', ') : [],
    isCa: basic?.value?.startsWith('CA:TRUE') ?? false,
    der,
  }
}

export async function fingerprints(der: Uint8Array): Promise<{ sha1: string; sha256: string }> {
  const digest = async (algorithm: string) =>
    toHex(new Uint8Array(await crypto.subtle.digest(algorithm, der as unknown as BufferSource)), ':').toUpperCase()
  return { sha1: await digest('SHA-1'), sha256: await digest('SHA-256') }
}

export type Expiry = 'valid' | 'expired' | 'notYet'

export function expiryOf(cert: Certificate, now = new Date()): { state: Expiry; days: number } {
  const days = Math.floor((cert.notAfter.getTime() - now.getTime()) / 86_400_000)
  if (now < cert.notBefore) return { state: 'notYet', days }
  if (now > cert.notAfter) return { state: 'expired', days }
  return { state: 'valid', days }
}

/** Splits a PEM bundle so a full chain can be inspected, not just the leaf. */
export function splitPemChain(input: string): string[] {
  const matches = input.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g)
  return matches ?? (input.trim() ? [input] : [])
}

export { readSequence }
