import { describe, merge, singular, pascalCase, collectNamed } from '../src/tools/json-types/infer.ts'
import { emitTypeScript, emitGo, goFieldName } from '../src/tools/json-types/emit.ts'
import { done, eq } from './harness.mjs'

const opts = { rootName: 'Root', goPointers: true, tsTypeAlias: false }
const ts = (json, o={}) => emitTypeScript(describe(JSON.parse(json)), { ...opts, ...o })
const go = (json, o={}) => emitGo(describe(JSON.parse(json)), { ...opts, ...o })

console.log('--- primitives and scalars ---')
eq('int vs float', go('{"a":1,"b":1.5}'), 'type Root struct {\n\tA int64   `json:"a"`\n\tB float64 `json:"b"`\n}\n')
eq('ts scalars', ts('{"s":"x","n":1,"b":true}'), 'export interface Root {\n  s: string\n  n: number\n  b: boolean\n}\n')

console.log('\n--- the merge rules: the part a sample cannot state outright ---')
// Second element adds a field -> that field must be optional, not required.
eq('array elements merge, missing key becomes optional',
  ts('{"items":[{"a":1},{"a":2,"b":"x"}]}'),
  'export interface Root {\n  items: Item[]\n}\n\nexport interface Item {\n  a: number\n  b?: string\n}\n')
// One float among ints promotes the whole field.
eq('one float promotes the field', go('{"xs":[1,2,3.5]}'), 'type Root struct {\n\tXs []float64 `json:"xs"`\n}\n')
// null alongside a string is nullable, not "null".
eq('null + string is nullable in ts', ts('{"xs":["a",null]}'),
  'export interface Root {\n  xs: (string | null)[]\n}\n')
eq('null + string is a pointer in go', go('{"xs":["a",null]}'),
  'type Root struct {\n\tXs []*string `json:"xs"`\n}\n')
// Genuinely mixed types.
eq('mixed primitives union in ts', ts('{"x":[1,"a"]}'),
  'export interface Root {\n  x: (number | string)[]\n}\n')
eq('mixed primitives become any in go', go('{"x":[1,"a"]}'),
  'type Root struct {\n\tX []any `json:"x"`\n}\n')
eq('empty array is unknown', ts('{"xs":[]}'), 'export interface Root {\n  xs: unknown[]\n}\n')
eq('nested objects merge deeply',
  ts('{"a":[{"n":{"x":1}},{"n":{"x":2,"y":3}}]}'),
  'export interface Root {\n  a: AItem[]\n}\n\nexport interface AItem {\n  n: N\n}\n\nexport interface N {\n  x: number\n  y?: number\n}\n')

console.log('\n--- identical shapes share one declaration ---')
eq('100 identical records -> one interface',
  ts(JSON.stringify({ users: Array.from({length:100},(_,i)=>({ id:i, name:'n' })) })),
  'export interface Root {\n  users: User[]\n}\n\nexport interface User {\n  id: number\n  name: string\n}\n')
eq('same shape under two keys is reused',
  ts('{"from":{"x":1},"to":{"x":2}}'),
  'export interface Root {\n  from: From\n  to: From\n}\n\nexport interface From {\n  x: number\n}\n')

console.log('\n--- naming ---')
eq('singular: ies->y', singular('categories'), 'category')
eq('singular: sses->ss', singular('addresses'), 'address')
eq('singular: plain s', singular('items'), 'item')
eq('singular: keeps ss', singular('status'), 'status')
eq('pascal from snake', pascalCase('user_first_name'), 'UserFirstName')
eq('pascal from kebab', pascalCase('user-first-name'), 'UserFirstName')
eq('pascal from camel', pascalCase('userFirstName'), 'UserFirstName')
eq('root array element does not steal the root name',
  ts('[{"a":1}]'),
  'export interface RootItem {\n  a: number\n}\n\nexport type Root = RootItem[]\n')

console.log('\n--- go field names follow the linters ---')
for (const [key, want] of [['id','ID'],['user_id','UserID'],['url','URL'],['api_url','APIURL'],['httpStatus','HTTPStatus'],['uuid','UUID'],['name','Name'],['2fa','F2fa']])
  eq(`goFieldName ${key}`, goFieldName(key), want)
eq('go tag keeps the original key and marks optional',
  go('{"items":[{"user_id":1},{"user_id":2,"is_ok":true}]}'),
  'type Root struct {\n\tItems []Item `json:"items"`\n}\n\ntype Item struct {\n\tUserID int64 `json:"user_id"`\n\tIsOK   *bool `json:"is_ok,omitempty"`\n}\n')

console.log('\n--- awkward keys ---')
eq('ts quotes invalid identifiers', ts('{"a-b":1,"ok":2,"1x":3}'),
  'export interface Root {\n  "a-b": number\n  ok: number\n  "1x": number\n}\n')

console.log('\n--- options ---')
eq('ts type alias', ts('{"a":1}', { tsTypeAlias: true }), 'export type Root = {\n  a: number\n}\n')
eq('go without pointers', go('{"xs":["a",null]}', { goPointers: false }),
  'type Root struct {\n\tXs []string `json:"xs"`\n}\n')
eq('custom root name', ts('{"a":1}', { rootName: 'api response' }),
  'export interface ApiResponse {\n  a: number\n}\n')

console.log('\n--- scalar and array roots ---')
eq('scalar root', ts('42'), 'export type Root = number\n')
eq('array of scalars root', ts('[1,2]'), 'export type Root = number[]\n')
eq('null root', ts('null'), 'export type Root = null\n')
eq('go scalar root', go('"x"'), 'type Root string\n')

done()
