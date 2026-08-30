import { parseCertificate, formatName, fingerprints, expiryOf, splitPemChain, pemToDer, Asn1Error } from '../src/tools/x509/x509.ts'
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { webcrypto } from 'node:crypto'
if (!globalThis.crypto) globalThis.crypto = webcrypto
if (!globalThis.atob) globalThis.atob = (b) => Buffer.from(b, 'base64').toString('binary')
import { done, eq } from './harness.mjs'

const DIR = new URL('./fixtures', import.meta.url).pathname
const ssl = (file, args) => execSync(`openssl x509 -in ${DIR}/${file} -noout ${args}`, {encoding:'utf8'}).trim()

// openssl prints "subject=C=IL, ST=..., CN=..."; strip the label to compare.
const sslValue = (file, flag) => ssl(file, flag).replace(/^[a-zA-Z0-9 ]+=/, '').trim()

for (const file of ['c.pem','ec.pem','ca.pem','u.pem']) {
  console.log(`\n--- ${file}, cross-checked against openssl ---`)
  const cert = parseCertificate(readFileSync(`${DIR}/${file}`,'utf8'))

  eq('subject', formatName(cert.subject), sslValue(file,'-subject'))
  eq('issuer',  formatName(cert.issuer),  sslValue(file,'-issuer'))
  eq('serial',  cert.serialNumber,        ssl(file,'-serial').replace('serial=',''))

  // openssl prints dates as "Aug 30 17:31:43 2026 GMT"; compare as instants.
  const nb = new Date(ssl(file,'-startdate').replace('notBefore=','') + '')
  const na = new Date(ssl(file,'-enddate').replace('notAfter=','') + '')
  eq('notBefore', cert.notBefore.getTime(), nb.getTime())
  eq('notAfter',  cert.notAfter.getTime(),  na.getTime())

  const fp = await fingerprints(cert.der)
  eq('sha256 fingerprint', fp.sha256, ssl(file,'-fingerprint -sha256').split('=')[1])
  eq('sha1 fingerprint',   fp.sha1,   ssl(file,'-fingerprint -sha1').split('=')[1])

  const text = execSync(`openssl x509 -in ${DIR}/${file} -noout -text`, {encoding:'utf8'})
  eq('signature algorithm', text.includes(cert.signatureAlgorithm), true)
  eq('version', cert.version, Number(text.match(/Version: (\d)/)[1]))

  if (cert.publicKey.algorithm === 'RSA') {
    eq('rsa key size', cert.publicKey.size, Number(text.match(/Public-Key: \((\d+) bit\)/)[1]))
  } else {
    eq('ec key size', cert.publicKey.size, Number(text.match(/Public-Key: \((\d+) bit\)/)[1]))
    eq('ec curve named', cert.publicKey.curve !== null, true)
  }
}

console.log('\n--- extensions on the fully-loaded cert ---')
const c = parseCertificate(readFileSync(`${DIR}/c.pem`,'utf8'))
eq('SAN list', c.subjectAltNames.join(' '), 'DNS:tools.molyuk.com DNS:www.molyuk.com IP:192.0.2.1 email:a@b.com')
eq('not a CA', c.isCa, false)
eq('basicConstraints critical', c.extensions.find(e=>e.name==='basicConstraints').critical, true)
eq('keyUsage decoded', c.extensions.find(e=>e.name==='keyUsage').value, 'digitalSignature, keyEncipherment')
eq('extKeyUsage decoded', c.extensions.find(e=>e.name==='extKeyUsage').value, 'serverAuth, clientAuth')

const ca = parseCertificate(readFileSync(`${DIR}/ca.pem`,'utf8'))
eq('CA detected', ca.isCa, true)
eq('pathlen kept', ca.extensions.find(e=>e.name==='basicConstraints').value, 'CA:TRUE, pathlen:2')
eq('CA key usage', ca.extensions.find(e=>e.name==='keyUsage').value, 'keyCertSign, cRLSign')

console.log('\n--- non-ASCII subject survives ---')
const u = parseCertificate(readFileSync(`${DIR}/u.pem`,'utf8'))
eq('cyrillic O', u.subject.find(p=>p.key==='O').value, 'Тест Организация')
eq('cyrillic CN', u.subject.find(p=>p.key==='CN').value, 'пример.рф')
eq('email attribute named', u.subject.find(p=>p.key==='emailAddress').value, 'a@b.co')

console.log('\n--- validity window ---')
eq('30-day cert is valid now', expiryOf(u).state, 'valid')
eq('days remaining is about 30', Math.abs(expiryOf(u).days - 29) <= 1, true)
eq('expired is reported', expiryOf(u, new Date(Date.now()+40*864e5)).state, 'expired')
eq('not-yet is reported', expiryOf(u, new Date(Date.now()-864e5)).state, 'notYet')

console.log('\n--- input handling ---')
eq('accepts bare base64 without armour', parseCertificate(readFileSync(`${DIR}/c.pem`,'utf8').replace(/-----[^-]+-----/g,'')).serialNumber, c.serialNumber)
eq('chain split finds both', splitPemChain(readFileSync(`${DIR}/c.pem`,'utf8') + '\n' + readFileSync(`${DIR}/ca.pem`,'utf8')).length, 2)
for (const bad of ['', 'not a cert', '-----BEGIN CERTIFICATE-----\nzzz\n-----END CERTIFICATE-----'])
  { let t=false; try { parseCertificate(bad) } catch(e){ t = e instanceof Error } eq(`rejects ${JSON.stringify(bad.slice(0,20))}`, t, true) }
// Truncated DER must be refused, not half-read.
let trunc=false
try { parseCertificate(Buffer.from(pemToDer(readFileSync(`${DIR}/c.pem`,'utf8')).slice(0,200)).toString('base64')) } catch { trunc=true }
eq('rejects truncated DER', trunc, true)

done()
