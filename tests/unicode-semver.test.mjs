import { inspect, summarize, normalisations } from '../src/tools/unicode/unicode.ts'
import { parse, compare, satisfies, sort, format, bump } from '../src/tools/semver/semver.ts'
import { done, eq } from './harness.mjs'

console.log('--- unicode: the counts that disagree with the eye ---')
const flag = '🇩🇪', family = '👨‍👩‍👧', eAcute = 'é', eCombining = 'é'
eq('emoji: 1 code point, 2 UTF-16 units, 4 bytes', `${summarize('🔒').codePoints}/${summarize('🔒').utf16Units}/${summarize('🔒').utf8Bytes}`, '1/2/4')
eq('flag is 2 code points but 1 grapheme', `${summarize(flag).codePoints}/${summarize(flag).graphemes}`, '2/1')
eq('ZWJ family is 5 code points, 1 grapheme', `${summarize(family).codePoints}/${summarize(family).graphemes}`, '5/1')
eq('precomposed é is one code point', summarize(eAcute).codePoints, 1)
eq('decomposed é is two', summarize(eCombining).codePoints, 2)
eq('but both are one grapheme', summarize(eCombining).graphemes, 1)

console.log('--- unicode: per character ---')
const [ch] = inspect('🔒')
eq('code point', ch.code, 0x1f512)
eq('hex', ch.hex, '1F512')
eq('utf8 bytes', ch.utf8.join(' '), '240 159 148 146')
eq('utf16 surrogate pair', ch.utf16.map(u=>u.toString(16)).join(' '), 'd83d dd12')
eq('js escape uses braces above the BMP', ch.escapes.js, '\\u{1F512}')
eq('json escape uses the surrogate pair', ch.escapes.json, '\\uD83D\\uDD12')
eq('url escape', ch.escapes.url, '%F0%9F%94%92')
eq('html escape', ch.escapes.html, '&#128274;')  // 0x1F512
eq('named as emoji', ch.name, 'emoji')

console.log('--- unicode: the invisible ones, which is the point ---')
for (const [char, name] of [['​','ZERO WIDTH SPACE'],[' ','NO-BREAK SPACE'],['﻿','ZERO WIDTH NO-BREAK SPACE (BOM)'],['­','SOFT HYPHEN'],['‮','bidirectional override'],]) {
  const [c] = inspect(char)
  eq(`${name}`, `${c.name}/${c.invisible}`, `${name}/true`)
}
// U+FFFD is named but visible: it is the mojibake marker you can actually see.
eq('REPLACEMENT CHARACTER named but visible', `${inspect('\uFFFD')[0].name}/${inspect('\uFFFD')[0].invisible}`, 'REPLACEMENT CHARACTER/false')
eq('a normal letter is visible', inspect('a')[0].invisible, false)
eq('counts invisibles in a mixed string', summarize('a​b c').invisible, 2)
eq('finds a BOM at the start', inspect('﻿hello')[0].name.includes('BOM'), true)

console.log('--- unicode: normalisation explains a failing comparison ---')
eq('the two forms differ as strings', eAcute === eCombining, false)
eq('NFC makes them equal', eAcute.normalize('NFC') === eCombining.normalize('NFC'), true)
const norms = normalisations(eCombining)
eq('NFC is shorter in bytes', norms.find(n=>n.form==='NFC').bytes, 2)
eq('NFD keeps three bytes', norms.find(n=>n.form==='NFD').bytes, 3)
eq('flags which form matches the input', norms.find(n=>n.form==='NFD').same, true)
eq('NFKC folds a ligature', normalisations('ﬁ').find(n=>n.form==='NFKC').text, 'fi')

console.log('\n--- semver: parsing ---')
eq('plain', format(parse('1.2.3')), '1.2.3')
eq('v prefix accepted', format(parse('v1.2.3')), '1.2.3')
eq('prerelease', format(parse('1.0.0-alpha.1')), '1.0.0-alpha.1')
eq('build metadata', format(parse('1.0.0+build.5')), '1.0.0+build.5')
eq('both', format(parse('1.0.0-rc.1+exp.sha.5114f85')), '1.0.0-rc.1+exp.sha.5114f85')
for (const bad of ['1.2', '1', 'a.b.c', '1.2.3.4', '', '01.2.3 x'])
  eq(`rejects ${JSON.stringify(bad)}`, parse(bad), null)

console.log('--- semver: precedence, straight from the spec ---')
// The exact ordering published in semver.org §11.
const ORDER = ['1.0.0-alpha','1.0.0-alpha.1','1.0.0-alpha.beta','1.0.0-beta','1.0.0-beta.2','1.0.0-beta.11','1.0.0-rc.1','1.0.0']
let ordered = true
for (let i = 0; i + 1 < ORDER.length; i++) {
  if (compare(parse(ORDER[i]), parse(ORDER[i+1])) !== -1) { ordered = false; console.log(`    ${ORDER[i]} should precede ${ORDER[i+1]}`) }
}
eq('the spec ordering holds end to end', ordered, true)
eq('sorting reproduces it', sort(ORDER.map(parse).reverse()).map(format).join(' '), ORDER.join(' '))
eq('a prerelease is below its release', compare(parse('1.0.0-rc'), parse('1.0.0')), -1)
eq('numeric identifiers rank below alphanumeric', compare(parse('1.0.0-1'), parse('1.0.0-alpha')), -1)
eq('11 > 2 numerically, not as text', compare(parse('1.0.0-beta.11'), parse('1.0.0-beta.2')), 1)
eq('build metadata is ignored', compare(parse('1.0.0+a'), parse('1.0.0+b')), 0)

console.log('--- semver: ranges ---')
const S = (v, r) => satisfies(parse(v), r)
eq('^1.2.3 allows 1.9.0', S('1.9.0','^1.2.3'), true)
eq('^1.2.3 blocks 2.0.0', S('2.0.0','^1.2.3'), false)
eq('^1.2.3 blocks 1.2.2', S('1.2.2','^1.2.3'), false)
eq('^0.2.3 allows 0.2.9', S('0.2.9','^0.2.3'), true)
eq('^0.2.3 blocks 0.3.0', S('0.3.0','^0.2.3'), false)
eq('^0.0.3 blocks 0.0.4', S('0.0.4','^0.0.3'), false)
eq('~1.2.3 allows 1.2.9', S('1.2.9','~1.2.3'), true)
eq('~1.2.3 blocks 1.3.0', S('1.3.0','~1.2.3'), false)
eq('~1.2 blocks 1.3.0', S('1.3.0','~1.2'), false)
eq('~1 allows 1.9.9', S('1.9.9','~1'), true)
eq('1.2.x allows 1.2.9', S('1.2.9','1.2.x'), true)
eq('1.2.x blocks 1.3.0', S('1.3.0','1.2.x'), false)
eq('* allows anything', S('9.9.9','*'), true)
eq('>=1.0.0 <2.0.0 allows 1.5', S('1.5.0','>=1.0.0 <2.0.0'), true)
eq('>=1.0.0 <2.0.0 blocks 2.0.0', S('2.0.0','>=1.0.0 <2.0.0'), false)
eq('|| union', S('3.0.0','^1.0.0 || ^3.0.0'), true)
eq('|| union rejects the gap', S('2.0.0','^1.0.0 || ^3.0.0'), false)
eq('hyphen range inclusive', S('2.3.4','1.2.3 - 2.3.4'), true)
eq('hyphen range excludes past the end', S('2.3.5','1.2.3 - 2.3.4'), false)
eq('exact', S('1.2.3','1.2.3'), true)
eq('invalid range reported as null', S('1.2.3','not a range'), null)

console.log('--- semver: the prerelease rule that keeps betas out ---')
eq('^1.0.0 does not match 2.0.0-beta', S('2.0.0-beta','^1.0.0'), false)
eq('^1.0.0 does not match 1.5.0-beta', S('1.5.0-beta','^1.0.0'), false)
eq('>=1.0.0-alpha does match 1.0.0-beta', S('1.0.0-beta','>=1.0.0-alpha'), true)
eq('^1.0.0-alpha matches 1.0.0-beta', S('1.0.0-beta','^1.0.0-alpha'), true)
eq('but not a different triple', S('1.2.0-beta','^1.0.0-alpha'), false)
eq('a release still matches', S('1.5.0','^1.0.0-alpha'), true)

console.log('--- semver: bump ---')
eq('major', format(bump(parse('1.2.3'),'major')), '2.0.0')
eq('minor', format(bump(parse('1.2.3'),'minor')), '1.3.0')
eq('patch', format(bump(parse('1.2.3'),'patch')), '1.2.4')

done()
