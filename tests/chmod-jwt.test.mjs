import { parse, toOctal, toSymbolic, notes, rows, fromRows, ChmodError } from '../src/tools/chmod/chmod.ts'
import { verifyJwt, keyKindFor, algorithmOf } from '../src/tools/jwt/verify.ts'
import { webcrypto } from 'node:crypto'
if (!globalThis.crypto) globalThis.crypto = webcrypto
import { done, eq } from './harness.mjs'

const conv = (s) => { const p = parse(s); return `${toOctal(p)} ${toSymbolic(p)}` }

console.log('--- chmod: the everyday modes ---')
eq('644', conv('644'), '0644 rw-r--r--')
eq('755', conv('755'), '0755 rwxr-xr-x')
eq('777', conv('777'), '0777 rwxrwxrwx')
eq('600', conv('600'), '0600 rw-------')
eq('000', conv('000'), '0000 ---------')
eq('symbolic in', conv('rwxr-xr-x'), '0755 rwxr-xr-x')
eq('ls -l prefix ignored', conv('-rw-r--r--'), '0644 rw-r--r--')
eq('directory prefix ignored', conv('drwxr-xr-x'), '0755 rwxr-xr-x')

console.log('--- chmod: special bits, where the case carries a bit ---')
// Lower-case s/t means the special bit AND execute; upper-case means the special bit alone.
eq('4755 setuid with execute', conv('4755'), '4755 rwsr-xr-x')
eq('4644 setuid without execute', conv('4644'), '4644 rwSr--r--')
eq('2755 setgid', conv('2755'), '2755 rwxr-sr-x')
eq('2644 setgid without execute', conv('2644'), '2644 rw-r-Sr--')
eq('1777 sticky (/tmp)', conv('1777'), '1777 rwxrwxrwt')
eq('1666 sticky without execute', conv('1666'), '1666 rw-rw-rwT')
eq('7777 all special bits', conv('7777'), '7777 rwsrwsrwt')
eq('symbolic s round trips', conv('rwsr-xr-x'), '4755 rwsr-xr-x')
eq('symbolic S round trips', conv('rwSr--r--'), '4644 rwSr--r--')
eq('symbolic T round trips', conv('rw-rw-rwT'), '1666 rw-rw-rwT')

console.log('--- chmod: octal <-> symbolic is lossless in both directions ---')
let bad = 0
for (let mode = 0; mode <= 0o7777; mode++) {
  const octal = mode.toString(8).padStart(4, '0')
  const p = parse(octal)
  if (toOctal(p) !== octal) { bad++; continue }
  const back = parse(toSymbolic(p))
  if (toOctal(back) !== octal) bad++
}
eq('all 4096 modes survive both round trips', bad, 0)

console.log('--- chmod: rejects nonsense ---')
for (const s of ['', '8', '999', '77777', 'rwx', 'rwxrwxrwxr', 'zwxr-xr-x', 'rw*r--r--', 'abc'])
  { let t=false; try { parse(s) } catch(e){ t = e instanceof ChmodError } eq(`rejects ${JSON.stringify(s)}`, t, true) }

console.log('--- chmod: checkbox grid mirrors the bits ---')
const p755 = parse('755')
eq('rows', rows(p755).map(r=>`${r.name}:${+r.read}${+r.write}${+r.execute}`).join(' '), 'user:111 group:101 other:101')
eq('fromRows inverts rows', toOctal(fromRows(rows(p755), p755)), '0755')
eq('notes flag world-writable', notes(parse('777')).includes('worldWritable'), true)
eq('notes flag setuid', notes(parse('4755')).includes('setuid'), true)
eq('no notes for 644', notes(parse('644')).length, 0)

console.log('\n--- JWT: HMAC ---')
const b64u = (buf) => Buffer.from(buf).toString('base64url')
async function signHS(payload, secret, alg='HS256') {
  const hash = { HS256:'SHA-256', HS384:'SHA-384', HS512:'SHA-512' }[alg]
  const head = b64u(JSON.stringify({ alg, typ:'JWT' }))
  const body = b64u(JSON.stringify(payload))
  const key = await webcrypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name:'HMAC', hash }, false, ['sign'])
  const sig = await webcrypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${head}.${body}`))
  return `${head}.${body}.${b64u(sig)}`
}
for (const alg of ['HS256','HS384','HS512']) {
  const token = await signHS({ sub:'1' }, 'topsecret', alg)
  eq(`${alg} correct secret`, (await verifyJwt(token, 'topsecret')).status, 'valid')
  eq(`${alg} wrong secret`,   (await verifyJwt(token, 'nope')).status, 'invalid')
}
const hs = await signHS({ sub:'1' }, 'topsecret')
eq('tampered payload fails', (await verifyJwt(hs.split('.')[0] + '.' + b64u('{"sub":"2"}') + '.' + hs.split('.')[2], 'topsecret')).status, 'invalid')
eq('empty key reported separately', (await verifyJwt(hs, '')).status, 'badKey')

console.log('--- JWT: the "none" bypass must never verify ---')
const noneToken = `${b64u('{"alg":"none","typ":"JWT"}')}.${b64u('{"sub":"admin"}')}.`
const noneResult = await verifyJwt(noneToken, 'anything')
eq('alg none is unsupported, not valid', noneResult.status, 'unsupported')
eq('and says why', noneResult.detail, 'none')
const noAlg = `${b64u('{"typ":"JWT"}')}.${b64u('{}')}.x`
eq('missing alg is unsupported', (await verifyJwt(noAlg, 'k')).status, 'unsupported')
eq('unknown alg is unsupported', (await verifyJwt(`${b64u('{"alg":"XX999"}')}.${b64u('{}')}.x`, 'k')).status, 'unsupported')

console.log('--- JWT: asymmetric, against keys generated here ---')
async function pem(key) {
  const der = await webcrypto.subtle.exportKey('spki', key)
  const b64 = Buffer.from(der).toString('base64').replace(/(.{64})/g, '$1\n')
  return `-----BEGIN PUBLIC KEY-----\n${b64}\n-----END PUBLIC KEY-----`
}
const CASES = [
  ['RS256', { name:'RSASSA-PKCS1-v1_5', modulusLength:2048, publicExponent:new Uint8Array([1,0,1]), hash:'SHA-256' }, 'RSASSA-PKCS1-v1_5'],
  ['PS256', { name:'RSA-PSS', modulusLength:2048, publicExponent:new Uint8Array([1,0,1]), hash:'SHA-256' }, { name:'RSA-PSS', saltLength:32 }],
  ['ES256', { name:'ECDSA', namedCurve:'P-256' }, { name:'ECDSA', hash:'SHA-256' }],
  ['ES384', { name:'ECDSA', namedCurve:'P-384' }, { name:'ECDSA', hash:'SHA-384' }],
]
for (const [alg, genParams, signParams] of CASES) {
  const pair = await webcrypto.subtle.generateKey(genParams, true, ['sign','verify'])
  const head = b64u(JSON.stringify({ alg, typ:'JWT' }))
  const body = b64u(JSON.stringify({ sub:'1' }))
  const sig = await webcrypto.subtle.sign(signParams, pair.privateKey, new TextEncoder().encode(`${head}.${body}`))
  const token = `${head}.${body}.${b64u(sig)}`
  const publicPem = await pem(pair.publicKey)
  eq(`${alg} verifies with its public key`, (await verifyJwt(token, publicPem)).status, 'valid')
  // A different key of the same kind must fail.
  const other = await webcrypto.subtle.generateKey(genParams, true, ['sign','verify'])
  eq(`${alg} rejects a foreign key`, (await verifyJwt(token, await pem(other.publicKey))).status, 'invalid')
  eq(`${alg} reports a malformed key`, (await verifyJwt(token, 'not a key')).status, 'badKey')
}
eq('key kind for HS256', keyKindFor('HS256'), 'secret')
eq('key kind for RS256', keyKindFor('RS256'), 'public')
eq('key kind for none', keyKindFor('none'), null)
eq('algorithmOf', algorithmOf({ alg:'HS256' }), 'HS256')

done()
