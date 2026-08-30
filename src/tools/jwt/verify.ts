/**
 * JWT signature verification.
 *
 * Web Crypto covers every algorithm in common use, so the work here is mapping the `alg`
 * header onto its parameters and getting the key into the right form: a raw secret for
 * HS*, an SPKI public key for the rest. The one thing this must never do is guess — an
 * unknown or absent `alg`, or `alg: none`, is reported as unverifiable rather than
 * quietly passed, which is the exact shape of the classic JWT bypass.
 */

export type VerifyStatus = 'valid' | 'invalid' | 'unsupported' | 'badKey'

export interface VerifyResult {
  status: VerifyStatus
  /** Detail for the badKey and unsupported cases. */
  detail?: string
}

interface AlgSpec {
  keyType: 'secret' | 'public'
  importAlgorithm: RsaHashedImportParams | EcKeyImportParams | HmacImportParams
  verifyAlgorithm: AlgorithmIdentifier | RsaPssParams | EcdsaParams
}

const ALGORITHMS: Record<string, AlgSpec> = {
  HS256: { keyType: 'secret', importAlgorithm: { name: 'HMAC', hash: 'SHA-256' }, verifyAlgorithm: 'HMAC' },
  HS384: { keyType: 'secret', importAlgorithm: { name: 'HMAC', hash: 'SHA-384' }, verifyAlgorithm: 'HMAC' },
  HS512: { keyType: 'secret', importAlgorithm: { name: 'HMAC', hash: 'SHA-512' }, verifyAlgorithm: 'HMAC' },

  RS256: { keyType: 'public', importAlgorithm: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, verifyAlgorithm: 'RSASSA-PKCS1-v1_5' },
  RS384: { keyType: 'public', importAlgorithm: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-384' }, verifyAlgorithm: 'RSASSA-PKCS1-v1_5' },
  RS512: { keyType: 'public', importAlgorithm: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-512' }, verifyAlgorithm: 'RSASSA-PKCS1-v1_5' },

  PS256: { keyType: 'public', importAlgorithm: { name: 'RSA-PSS', hash: 'SHA-256' }, verifyAlgorithm: { name: 'RSA-PSS', saltLength: 32 } },
  PS384: { keyType: 'public', importAlgorithm: { name: 'RSA-PSS', hash: 'SHA-384' }, verifyAlgorithm: { name: 'RSA-PSS', saltLength: 48 } },
  PS512: { keyType: 'public', importAlgorithm: { name: 'RSA-PSS', hash: 'SHA-512' }, verifyAlgorithm: { name: 'RSA-PSS', saltLength: 64 } },

  ES256: { keyType: 'public', importAlgorithm: { name: 'ECDSA', namedCurve: 'P-256' }, verifyAlgorithm: { name: 'ECDSA', hash: 'SHA-256' } },
  ES384: { keyType: 'public', importAlgorithm: { name: 'ECDSA', namedCurve: 'P-384' }, verifyAlgorithm: { name: 'ECDSA', hash: 'SHA-384' } },
  ES512: { keyType: 'public', importAlgorithm: { name: 'ECDSA', namedCurve: 'P-521' }, verifyAlgorithm: { name: 'ECDSA', hash: 'SHA-512' } },
}

export function algorithmOf(header: unknown): string | null {
  if (typeof header !== 'object' || header === null) return null
  const alg = (header as { alg?: unknown }).alg
  return typeof alg === 'string' ? alg : null
}

export function keyKindFor(alg: string | null): 'secret' | 'public' | null {
  if (!alg) return null
  return ALGORITHMS[alg.toUpperCase()]?.keyType ?? null
}

function base64UrlToBytes(part: string): Uint8Array {
  const padded = part.replaceAll('-', '+').replaceAll('_', '/')
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** Strips the PEM armour and returns the DER inside. Also accepts bare base64. */
function pemToDer(pem: string): Uint8Array {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '')
  if (!body || !/^[A-Za-z0-9+/]+=*$/.test(body)) throw new Error('not base64')
  const binary = atob(body)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export async function verifyJwt(token: string, keyMaterial: string): Promise<VerifyResult> {
  const parts = token.trim().split('.')
  if (parts.length !== 3) return { status: 'unsupported', detail: 'shape' }

  let header: unknown
  try {
    header = JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[0])))
  } catch {
    return { status: 'unsupported', detail: 'header' }
  }

  const alg = algorithmOf(header)
  if (!alg) return { status: 'unsupported', detail: 'noAlg' }
  // `none` is a valid JWS algorithm and an unsigned token; treating it as verified is
  // the textbook JWT vulnerability.
  if (alg.toLowerCase() === 'none') return { status: 'unsupported', detail: 'none' }

  const spec = ALGORITHMS[alg.toUpperCase()]
  if (!spec) return { status: 'unsupported', detail: alg }
  if (!keyMaterial.trim()) return { status: 'badKey', detail: 'empty' }

  let key: CryptoKey
  try {
    if (spec.keyType === 'secret') {
      key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(keyMaterial) as unknown as BufferSource,
        spec.importAlgorithm,
        false,
        ['verify'],
      )
    } else {
      key = await crypto.subtle.importKey(
        'spki',
        pemToDer(keyMaterial) as unknown as BufferSource,
        spec.importAlgorithm,
        false,
        ['verify'],
      )
    }
  } catch (e) {
    return { status: 'badKey', detail: e instanceof Error ? e.message : String(e) }
  }

  try {
    const signed = new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
    const ok = await crypto.subtle.verify(
      spec.verifyAlgorithm,
      key,
      base64UrlToBytes(parts[2]) as unknown as BufferSource,
      signed as unknown as BufferSource,
    )
    return { status: ok ? 'valid' : 'invalid' }
  } catch (e) {
    return { status: 'badKey', detail: e instanceof Error ? e.message : String(e) }
  }
}
