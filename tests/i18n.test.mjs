import { done, eq, note } from './harness.mjs'
import { readFileSync, readdirSync } from 'node:fs'

const src = readFileSync('src/i18n/messages.ts', 'utf8')
const body = src.replace(/^export const messages = /, '').replace(/\n\nexport type[\s\S]*$/, '').trim().replace(/,?\s*$/, '')
const messages = new Function(`return ${body}`)()

const get = (obj, key) => key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj)

// Static t('...') calls plus the dynamic key families the templates build at runtime.
const dynamic = {
  'src/tools/cidr/CidrCalculator.vue': [
    ...['network','netmask','wildcard','broadcast','firstHost','lastHost','firstAddress','lastAddress','totalAddresses','usableHosts','prefixLength','scope'].map(k => `tools.cidr.${k}`),
    ...['private','loopback','linkLocal','multicast','cgnat','reserved','public'].map(k => `tools.cidr.scope_${k}`),
  ],
  'src/tools/jwt/JwtDecoder.vue': ['expired','notYet','active','noExpiry'].map(k => `tools.jwt.${k}`),
  'src/tools/password/PasswordGenerator.vue': ['weak','fair','good','strong'].map(k => `tools.password.${k}`),
  'src/tools/timestamp/TimestampConverter.vue': ['unixSeconds','unixMillis','iso','utc','localIso','local','relative'].map(k => `tools.timestamp.${k}`),
  'src/tools/number-base/NumberBaseConverter.vue': ['binary','octal','decimal','hex'].map(k => `tools.numberBase.${k}`),
  'src/tools/case-convert/CaseConverter.vue': ['camel','pascal','snake','screamingSnake','kebab','train','dot','path','constant','sentence','title','lower','upper'].map(k => `tools.caseConvert.${k}`),
  'src/tools/cron/CronParser.vue': ['minute','hour','dayOfMonth','month','dayOfWeek'].map(k => `tools.cron.${k}`),
  'src/tools/color/ColorConverter.vue': ['onWhite','onBlack'].map(k => `tools.color.${k}`),
  'src/tools/user-agent/UserAgentParser.vue': [
    ...['browser','engine','os','device','bot'].map(k => `tools.userAgent.${k}`),
    ...['desktop','mobile','tablet','tv','bot'].map(k => `tools.userAgent.device_${k}`),
  ],
  'src/tools/dns/DnsLookup.vue': ['ok','nxdomain','servfail','refused'].map(k => `tools.dns.status_${k}`),
  'src/tools/qr/QrGenerator.vue': ['L','M','Q','H'].map(k => `tools.qr.level${k}`),
  'src/tools/jwt/JwtDecoder.vue': [
    ...['expired','notYet','active','noExpiry'].map(k => `tools.jwt.${k}`),
    ...['valid','invalid','unsupported','badKey'].map(k => `tools.jwt.verify_${k}`),
  ],
  'src/tools/x509/CertificateDecoder.vue': [
    ...['subject','issuer','serial','signature','publicKey','notBefore','notAfter','sha256','sha1'].map(k => `tools.x509.${k}`),
    ...['valid','expired','notYet'].map(k => `tools.x509.expiry_${k}`),
  ],
  'src/tools/unicode/UnicodeInspector.vue': ['graphemes','codePoints','utf16Units','utf8Bytes','nonAscii','invisible'].map(k => `tools.unicode.${k}`),
  'src/tools/rdap/RdapLookup.vue': ['domain','handle','dnssec'].map(k => `tools.rdap.${k}`),
  'src/tools/semver/SemverChecker.vue': ['major','minor','patch','prerelease','build'].map(k => `tools.semver.${k}`),
  'src/tools/chmod/ChmodCalculator.vue': [
    ...['octal','symbolic','command','read','write','execute'].map(k => `tools.chmod.${k}`),
    ...['user','group','other'].map(k => `tools.chmod.class_${k}`),
    ...['file','executable','private','privateDir','groupWritable','everything','tmp','setuidBinary'].map(k => `tools.chmod.preset_${k}`),
    ...['setuid','setgid','sticky','worldWritable','allPermissions','privateFile'].map(k => `tools.chmod.note_${k}`),
  ],
}

const files = []
for (const dir of readdirSync('src/tools', { withFileTypes: true })) {
  if (!dir.isDirectory()) continue
  for (const f of readdirSync(`src/tools/${dir.name}`)) files.push(`src/tools/${dir.name}/${f}`)
}
files.push('src/App.vue')
for (const f of readdirSync('src/views')) files.push(`src/views/${f}`)

let missing = 0, checked = 0
for (const file of files) {
  const text = readFileSync(file, 'utf8')
  const keys = new Set(dynamic[file] ?? [])
  for (const m of text.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)) keys.add(m[1])
  for (const m of text.matchAll(/(?:nameKey|descriptionKey):\s*'([^']+)'/g)) keys.add(m[1])
  for (const key of keys) {
    checked++
    for (const loc of ['ru', 'en']) {
      if (typeof get(messages[loc], key) !== 'string') {
        console.log(`MISSING [${loc}] ${key}   (${file})`)
        missing++
      }
    }
  }
}

// Every category referenced by a tool must have a label, and the two locales must match shape.
const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) =>
  typeof v === 'object' && v !== null ? flat(v, `${p}${k}.`) : [`${p}${k}`])
const ruKeys = new Set(flat(messages.ru))
const enKeys = new Set(flat(messages.en))
for (const k of ruKeys) if (!enKeys.has(k)) { console.log(`EN missing: ${k}`); missing++ }
for (const k of enKeys) if (!ruKeys.has(k)) { console.log(`RU missing: ${k}`); missing++ }

note(`checked ${checked} key usages across ${files.length} files`)
eq('every key a component asks for resolves in both locales', missing, 0)
eq('ru and en have the same key set', ruKeys.size, enKeys.size)
done()
