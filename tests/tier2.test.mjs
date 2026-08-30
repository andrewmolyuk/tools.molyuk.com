import { splitWords, CASE_STYLES } from '../src/tools/case-convert/cases.ts'
import { encodeEntities, decodeEntities, NAMED_COUNT } from '../src/tools/html-entities/entities.ts'
import { ulid, nanoid } from '../src/tools/id-generator/formats.ts'
import { webcrypto } from 'node:crypto'
if (!globalThis.crypto) globalThis.crypto = webcrypto
import { done, eq } from './harness.mjs'

const style = (k) => CASE_STYLES.find(s => s.key === k).convert
const conv = (k, s) => style(k)(splitWords(s))

console.log('--- word splitting (the part everything else depends on) ---')
eq('camelCase', splitWords('camelCaseValue').join('|'), 'camel|Case|Value')
eq('acronym run', splitWords('parseHTTPResponse').join('|'), 'parse|HTTP|Response')
eq('leading acronym', splitWords('HTTPServer').join('|'), 'HTTP|Server')
eq('all caps', splitWords('HTTP').join('|'), 'HTTP')
eq('snake', splitWords('snake_case_value').join('|'), 'snake|case|value')
eq('kebab', splitWords('kebab-case-value').join('|'), 'kebab|case|value')
eq('dots and slashes', splitWords('a.b/c\\d:e').join('|'), 'a|b|c|d|e')
eq('digits split', splitWords('utf8Value').join('|'), 'utf|8|Value')
eq('version', splitWords('parseV2Api').join('|'), 'parse|V|2|Api')
eq('collapses separators', splitWords('a___b   c').join('|'), 'a|b|c')
eq('empty', splitWords('   ').length, 0)

console.log('\n--- case styles ---')
eq('camel', conv('camel', 'parseHTTPResponse'), 'parseHttpResponse')
eq('pascal', conv('pascal', 'parse http response'), 'ParseHttpResponse')
eq('snake', conv('snake', 'parseHTTPResponse'), 'parse_http_response')
eq('screaming', conv('screamingSnake', 'parseHTTPResponse'), 'PARSE_HTTP_RESPONSE')
eq('kebab', conv('kebab', 'parseHTTPResponse'), 'parse-http-response')
eq('train', conv('train', 'parse http response'), 'Parse-Http-Response')
eq('dot', conv('dot', 'parseHTTPResponse'), 'parse.http.response')
eq('path', conv('path', 'parseHTTPResponse'), 'parse/http/response')
eq('sentence', conv('sentence', 'parseHTTPResponse'), 'Parse http response')
eq('title keeps minor words down', conv('title', 'the lord of the rings'), 'The Lord of the Rings')
eq('title capitalises last word', conv('title', 'something to look at'), 'Something to Look At')
eq('upper', conv('upper', 'a b'), 'A B')

console.log('\n--- case round trips ---')
for (const src of ['userName', 'parseHTTPResponse', 'a_b_c', 'XMLHttpRequest']) {
  const words = splitWords(src)
  eq(`${src}: snake->camel stable`, conv('camel', conv('snake', src)), style('camel')(words))
  eq(`${src}: kebab->pascal stable`, conv('pascal', conv('kebab', src)), style('pascal')(words))
}

console.log('\n--- HTML entities ---')
console.log(`  named table: ${NAMED_COUNT} entries`)
eq('escapes the five', encodeEntities(`<a href="x">&'`, 'minimal'), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;')
eq('minimal leaves non-ASCII', encodeEntities('café ©', 'minimal'), 'café ©')
eq('named non-ASCII', encodeEntities('café ©', 'named'), 'caf&eacute; &copy;')
eq('numeric non-ASCII', encodeEntities('café ©', 'numeric'), 'caf&#233; &#169;')
eq('decode named', decodeEntities('&lt;b&gt;&amp;&quot;'), '<b>&"')
eq('decode numeric dec', decodeEntities('&#65;&#66;'), 'AB')
eq('decode numeric hex', decodeEntities('&#x41;&#X42;'), 'AB')
eq('decode astral', decodeEntities('&#128512;'), '😀')
eq('unknown entity untouched', decodeEntities('&notreal; &fake;'), '&notreal; &fake;')
eq('lone ampersand untouched', decodeEntities('a & b'), 'a & b')
eq('surrogate rejected', decodeEntities('&#55296;'), '&#55296;')
eq('out of range rejected', decodeEntities('&#1114112;'), '&#1114112;')
eq('markup not executed as markup', decodeEntities('<img src=x onerror=alert(1)>'), '<img src=x onerror=alert(1)>')
eq('textarea breakout is inert', decodeEntities('a</textarea><b>c'), 'a</textarea><b>c')

console.log('\n--- entity round trips ---')
let bad = 0
const samples = ['plain', '<b>&amp;</b>', 'café ©®™', 'quotes "x" \'y\'', '😀 emoji', 'a & b < c > d']
for (const mode of ['minimal','named','numeric']) {
  for (const s of samples) {
    if (decodeEntities(encodeEntities(s, mode)) !== s) { bad++; console.log(`    FAIL ${mode}: ${s}`) }
  }
}
eq('encode->decode is identity for all modes', bad, 0)

console.log('\n--- ULID / nanoid ---')
const CROCK = /^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{26}$/
eq('ulid shape', CROCK.test(ulid()), true)
eq('ulid length', ulid().length, 26)
const ids = new Set(Array.from({length: 20000}, () => ulid()))
eq('20000 ulids distinct', ids.size, 20000)
// The timestamp prefix must make them sort in creation order.
const a = ulid(1000000000000), b = ulid(1000000000001), c = ulid(2000000000000)
eq('ulid sorts by time', [c,a,b].sort().join(',') === [a,b,c].sort().join(',') && a < b && b < c, true)
eq('ulid no ambiguous letters', /[ILOU]/.test(ulid()), false)
eq('nanoid default length', nanoid().length, 21)
eq('nanoid custom length', nanoid(10).length, 10)
eq('nanoid url-safe', /^[A-Za-z0-9_-]+$/.test(nanoid(64)), true)
const nids = new Set(Array.from({length: 20000}, () => nanoid()))
eq('20000 nanoids distinct', nids.size, 20000)
// Uniformity of the nanoid alphabet: 64 divides 256, so no character may be favoured.
const counts = new Map()
for (const ch of nanoid(60000)) counts.set(ch, (counts.get(ch) ?? 0) + 1)
const exp = 60000/64
const chi = [...counts.values()].reduce((a,c) => a + (c-exp)**2/exp, 0)
eq(`nanoid alphabet uniform (chi2=${chi.toFixed(1)}, df=63)`, chi < 110, true)
eq('nanoid uses all 64 chars', counts.size, 64)

done()
