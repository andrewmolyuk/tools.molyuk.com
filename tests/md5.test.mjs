import { md5 } from '../src/tools/hash-generator/md5.ts'
import { createHash, randomBytes } from 'node:crypto'
import { done, eq } from './harness.mjs'

const enc = (s) => new TextEncoder().encode(s)

// RFC 1321 test suite.
console.log('--- RFC 1321 vectors ---')
eq('""', md5(enc('')), 'd41d8cd98f00b204e9800998ecf8427e')
eq('"a"', md5(enc('a')), '0cc175b9c0f1b6a831c399e269772661')
eq('"abc"', md5(enc('abc')), '900150983cd24fb0d6963f7d28e17f72')
eq('"message digest"', md5(enc('message digest')), 'f96b697d7cb7938d525a2f31aaf161d0')
eq('a-z', md5(enc('abcdefghijklmnopqrstuvwxyz')), 'c3fcd3d76192e4007dfb496cca67e13b')
eq('alnum', md5(enc('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789')), 'd174ab98d277d9f5a5611c2c9f419d9f')
eq('8x"1234567890"', md5(enc('1234567890'.repeat(8))), '57edf4a22be3c955ac49da2e2107b67a')

// Block-boundary lengths are where padding bugs hide.
console.log('\n--- padding boundaries vs node crypto ---')
for (const n of [53, 54, 55, 56, 57, 63, 64, 65, 119, 120, 127, 128, 129, 1000]) {
  const b = randomBytes(n)
  const want = createHash('md5').update(b).digest('hex')
  eq(`${n} bytes`, md5(new Uint8Array(b)), want)
}

console.log('\n--- fuzz vs node crypto ---')
let bad = 0
for (let i = 0; i < 5000; i++) {
  const b = randomBytes(Math.floor(Math.random() * 300))
  if (md5(new Uint8Array(b)) !== createHash('md5').update(b).digest('hex')) bad++
}
eq('5000 random inputs match node', bad, 0)

// UTF-8 must be hashed as bytes, not code units.
eq('cyrillic', md5(enc('Андрей')), createHash('md5').update('Андрей', 'utf8').digest('hex'))
eq('emoji', md5(enc('🔒🔑')), createHash('md5').update('🔒🔑', 'utf8').digest('hex'))

done()
