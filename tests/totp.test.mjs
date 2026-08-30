import { base32Decode, base32Encode, totp, hotp, counterFor, secondsRemaining, parseOtpAuth, buildOtpAuth, Base32Error, DEFAULTS } from '../src/tools/totp/totp.ts'
import { webcrypto } from 'node:crypto'
if (!globalThis.crypto) globalThis.crypto = webcrypto
import { done, eq } from './harness.mjs'


console.log('--- base32 (RFC 4648 vectors) ---')
const enc = (s) => base32Encode(new TextEncoder().encode(s))
eq('""',      enc(''),       '')
eq('"f"',     enc('f'),      'MY')
eq('"fo"',    enc('fo'),     'MZXQ')
eq('"foo"',   enc('foo'),    'MZXW6')
eq('"foob"',  enc('foob'),   'MZXW6YQ')
eq('"fooba"', enc('fooba'),  'MZXW6YTB')
eq('"foobar"',enc('foobar'), 'MZXW6YTBOI')
const dec = (s) => new TextDecoder().decode(base32Decode(s))
eq('decode MZXW6YTBOI', dec('MZXW6YTBOI'), 'foobar')
eq('padding tolerated', dec('MZXW6YTBOI======'), 'foobar')
eq('spaces tolerated', dec('MZXW 6YTB OI'), 'foobar')
eq('lower case tolerated', dec('mzxw6ytboi'), 'foobar')
let threw = false
try { base32Decode('MZXW0') } catch (e) { threw = e instanceof Base32Error }
eq('rejects a character outside the alphabet', threw, true)

console.log('\n--- RFC 6238 Appendix B test vectors ---')
// The published seeds are ASCII strings; the RFC prints the codes at 8 digits.
const seeds = {
  'SHA-1':   '12345678901234567890',
  'SHA-256': '12345678901234567890123456789012',
  'SHA-512': '1234567890123456789012345678901234567890123456789012345678901234',
}
const VECTORS = [
  [59,          'SHA-1',   '94287082'],
  [59,          'SHA-256', '46119246'],
  [59,          'SHA-512', '90693936'],
  [1111111109,  'SHA-1',   '07081804'],
  [1111111111,  'SHA-1',   '14050471'],
  [1234567890,  'SHA-1',   '89005924'],
  [2000000000,  'SHA-1',   '69279037'],
  [20000000000, 'SHA-1',   '65353130'],
  [1111111109,  'SHA-256', '68084774'],
  [20000000000, 'SHA-256', '77737706'],
  [1111111109,  'SHA-512', '25091201'],
  [20000000000, 'SHA-512', '47863826'],
]
for (const [time, algorithm, want] of VECTORS) {
  const secret = new TextEncoder().encode(seeds[algorithm])
  const got = await totp(secret, time, { digits: 8, period: 30, algorithm })
  eq(`t=${String(time).padStart(11)} ${algorithm}`, got, want)
}

console.log('\n--- counter and countdown ---')
eq('counter at t=59, period 30', counterFor(59, 30), 1)
eq('counter at t=60', counterFor(60, 30), 2)
eq('counter past 2^32 periods stays exact', counterFor(20000000000, 30), 666666666)
eq('countdown just after a step', secondsRemaining(60, 30), 30)
eq('countdown mid-step', secondsRemaining(75, 30), 15)
eq('countdown just before a step', secondsRemaining(89, 30), 1)

console.log('\n--- 6-digit codes and stability within a period ---')
const secret = base32Decode('JBSWY3DPEHPK3PXP')
// 1699999980 is exactly a period boundary, so 1699999980..1700000009 is one window.
const a = await totp(secret, 1699999980, DEFAULTS)
const b = await totp(secret, 1700000009, DEFAULTS)
const c = await totp(secret, 1700000010, DEFAULTS)
eq('6 digits', a.length, 6)
eq('same code across one period', a, b)
eq('new code after the step', a === c, false)
eq('all digits', /^\d{6}$/.test(a), true)
// A code is zero-padded, never shortened.
let padded = 0
for (let t = 0; t < 4000; t++) { const code = await totp(secret, t * 30, DEFAULTS); if (code.length !== 6) padded++ }
eq('4000 codes are all exactly 6 chars', padded, 0)

console.log('\n--- otpauth:// URIs ---')
const parsed = parseOtpAuth('otpauth://totp/ACME%20Co:alice%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=ACME%20Co&algorithm=SHA256&digits=8&period=60')
eq('secret', parsed.secret, 'JBSWY3DPEHPK3PXP')
eq('issuer', parsed.issuer, 'ACME Co')
eq('account', parsed.account, 'alice@example.com')
eq('algorithm', parsed.options.algorithm, 'SHA-256')
eq('digits', parsed.options.digits, 8)
eq('period', parsed.options.period, 60)
const bare = parseOtpAuth('otpauth://totp/alice?secret=JBSWY3DPEHPK3PXP')
eq('defaults when unspecified', `${bare.options.digits}/${bare.options.period}/${bare.options.algorithm}`, '6/30/SHA-1')
eq('issuer from the label', parseOtpAuth('otpauth://totp/GitHub:bob?secret=AA').issuer, 'GitHub')
eq('rejects hotp', parseOtpAuth('otpauth://hotp/x?secret=AA'), null)
eq('rejects a non-uri', parseOtpAuth('nonsense'), null)
eq('rejects a missing secret', parseOtpAuth('otpauth://totp/x'), null)
eq('round trip', parseOtpAuth(buildOtpAuth('JBSWY3DPEHPK3PXP','ACME','alice',{digits:8,period:60,algorithm:'SHA-256'})).options.digits, 8)

done()
