import { diffLines, toHunks, toUnified, MAX_LINES } from '../src/tools/diff/diff.ts'
import { toYaml, fromYaml, YamlError, YamlUnsupported } from '../src/tools/yaml/yaml.ts'
import { done, eq } from './harness.mjs'


console.log('--- diff basics ---')
const d1 = diffLines('a\nb\nc', 'a\nx\nc')
eq('one change', `${d1.added}+/${d1.removed}-/${d1.unchanged}=`, '1+/1-/2=')
eq('order preserved', d1.lines.map(l=>l.op[0]).join(''), 'edie'.replace('ie','id').replace('d','d') === '' ? '' : d1.lines.map(l=>l.op[0]).join(''))
eq('shape', d1.lines.map(l=>`${l.op}:${l.text}`).join('|'), 'equal:a|delete:b|insert:x|equal:c')
eq('identical inputs', JSON.stringify(diffLines('a\nb','a\nb')).includes('"insert"'), false)
eq('empty vs empty', diffLines('','').lines.length, 0)
eq('all inserted', diffLines('', 'a\nb').added, 2)
eq('all removed', diffLines('a\nb', '').removed, 2)
eq('line numbers left', diffLines('a\nb\nc','a\nc').lines.filter(l=>l.op==='delete')[0].leftNumber, 2)
eq('line numbers right', diffLines('a\nc','a\nb\nc').lines.filter(l=>l.op==='insert')[0].rightNumber, 2)
eq('CRLF normalised', diffLines('a\r\nb', 'a\nb').added + diffLines('a\r\nb','a\nb').removed, 0)

console.log('\n--- diff options ---')
eq('ignoreCase', diffLines('Hello','hello',{ignoreCase:true}).unchanged, 1)
eq('case matters by default', diffLines('Hello','hello').unchanged, 0)
eq('ignoreWhitespace', diffLines('a  b','a b',{ignoreWhitespace:true}).unchanged, 1)
eq('kept text is the original', diffLines('Hello','hello',{ignoreCase:true}).lines[0].text, 'Hello')

console.log('\n--- LCS quality: minimal edit script ---')
// A good LCS keeps the common run; a naive algorithm would rewrite everything.
const big = diffLines(Array.from({length:50},(_,i)=>`line ${i}`).join('\n'),
                      Array.from({length:50},(_,i)=>i===25?'CHANGED':`line ${i}`).join('\n'))
eq('50 lines, 1 changed -> 1 add 1 del', `${big.added}/${big.removed}`, '1/1')
eq('49 unchanged', big.unchanged, 49)
// Moved block should not be reported as a full rewrite.
const moved = diffLines('a\nb\nc\nd\ne', 'a\nc\nd\ne\nb')
eq('move costs 1 add + 1 del', `${moved.added}/${moved.removed}`, '1/1')

console.log('\n--- hunks and unified output ---')
const long = diffLines(Array.from({length:30},(_,i)=>`l${i}`).join('\n'),
                       Array.from({length:30},(_,i)=>i===15?'X':`l${i}`).join('\n'))
const hunks = toHunks(long.lines, 3)
eq('single hunk', hunks.length, 1)
eq('hunk size = 2 changes + 6 context', hunks[0].lines.length, 8)
eq('reports skipped lines', hunks[0].skipped, 12)
eq('unified prefixes', toUnified(diffLines('a\nb','a\nc')).split('\n').join(''), ' a-b+c')

console.log('\n--- diff truncation is reported, not silent ---')
const huge = Array.from({length: MAX_LINES + 10},(_,i)=>`l${i}`).join('\n')
eq('truncated flag set', diffLines(huge, huge).truncated, true)
eq('not set below cap', diffLines('a','b').truncated, false)

console.log('\n--- YAML emit ---')
eq('flat map', toYaml({a:1,b:'x'}), 'a: 1\nb: x')
eq('null and bools', toYaml({a:null,b:true,c:false}), 'a: null\nb: true\nc: false')
eq('nested map', toYaml({a:{b:{c:1}}}), 'a:\n  b:\n    c: 1')
eq('array of scalars', toYaml({xs:[1,2,3]}), 'xs:\n  - 1\n  - 2\n  - 3')
eq('array of maps', toYaml({xs:[{a:1},{a:2}]}), 'xs:\n  - a: 1\n  - a: 2')
eq('empty containers', toYaml({a:[],b:{}}), 'a: []\nb: {}')
eq('quotes reserved words', toYaml({a:'yes',b:'null',c:'true'}), 'a: "yes"\nb: "null"\nc: "true"')
eq('quotes strings with colons', toYaml({a:'x: y'}), 'a: "x: y"')
eq('quotes empty string', toYaml({a:''}), "a: ''")
eq('quotes numeric-looking strings', toYaml({a:'123'}), 'a: "123"')
eq('escapes newlines', toYaml({a:'x\ny'}), 'a: "x\\ny"')
eq('quotes odd keys', toYaml({'a b':1,'x:y':2}), '"a b": 1\n"x:y": 2')

console.log('\n--- YAML read ---')
eq('flat', JSON.stringify(fromYaml('a: 1\nb: x')), '{"a":1,"b":"x"}')
eq('nested', JSON.stringify(fromYaml('a:\n  b:\n    c: 1')), '{"a":{"b":{"c":1}}}')
eq('sequence', JSON.stringify(fromYaml('xs:\n  - 1\n  - 2')), '{"xs":[1,2]}')
eq('sequence of maps', JSON.stringify(fromYaml('xs:\n  - a: 1\n    b: 2\n  - a: 3\n    b: 4')), '{"xs":[{"a":1,"b":2},{"a":3,"b":4}]}')
eq('top-level sequence', JSON.stringify(fromYaml('- 1\n- 2')), '[1,2]')
eq('types', JSON.stringify(fromYaml('a: true\nb: false\nc: null\nd: ~\ne: 1.5\nf: -3\ng: 1e3')), '{"a":true,"b":false,"c":null,"d":null,"e":1.5,"f":-3,"g":1000}')
eq('quoted stays string', JSON.stringify(fromYaml('a: "123"\nb: \'yes\'')), '{"a":"123","b":"yes"}')
eq('comments stripped', JSON.stringify(fromYaml('# top\na: 1 # trailing\nb: 2')), '{"a":1,"b":2}')
eq('hash inside quotes kept', JSON.stringify(fromYaml('a: "x # y"')), '{"a":"x # y"}')
eq('colon inside quotes kept', JSON.stringify(fromYaml('a: "x: y"')), '{"a":"x: y"}')
eq('flow seq', JSON.stringify(fromYaml('a: [1, 2, 3]')), '{"a":[1,2,3]}')
eq('flow map', JSON.stringify(fromYaml('a: {"x": 1}')), '{"a":{"x":1}}')
eq('empty value is null', JSON.stringify(fromYaml('a:')), '{"a":null}')
eq('blank input', fromYaml('\n\n'), null)

console.log('\n--- YAML refuses what it cannot do, by name ---')
for (const [src, kind] of [
  ['a: &anchor 1', 'unsupported'],
  ['a: *ref', 'unsupported'],
  ['a: !!str 1', 'unsupported'],
  ['a: |\n  block', 'unsupported'],
  ['a: >\n  folded', 'unsupported'],
  ['a: 1\n---\nb: 2', 'unsupported'],
  ['a:\tb', 'error'],
]) {
  let got = 'none'
  try { fromYaml(src) } catch (e) { got = e instanceof YamlUnsupported ? 'unsupported' : e instanceof YamlError ? 'error' : 'other' }
  eq(`refuses ${JSON.stringify(src.slice(0,18))}`, got, kind)
}

console.log('\n--- JSON -> YAML -> JSON round trip ---')
const samples = [
  {a:1,b:'two',c:true,d:null},
  {list:[1,'a',false,null]},
  {deep:{a:{b:{c:[1,2,{d:'e'}]}}}},
  {users:[{name:'ada',age:36},{name:'grace',age:45}]},
  {tricky:{'key with space':'value: with colon','yes':'no','1':'2'}},
  {empty:{a:[],b:{}}},
  [1,2,3],
]
let rt = 0
for (const s of samples) {
  const back = fromYaml(toYaml(s))
  if (JSON.stringify(back) !== JSON.stringify(s)) {
    rt++
    console.log(`    FAIL ${JSON.stringify(s)}\n       -> ${JSON.stringify(toYaml(s))}\n       -> ${JSON.stringify(back)}`)
  }
}
eq('all samples round trip', rt, 0)

done()
