/**
 * Renders the inferred model as TypeScript or Go.
 *
 * The two languages disagree about the two things a JSON sample is least sure of.
 * TypeScript can say `string | number` and `field?:`; Go has neither, so a union
 * degrades to `any` and anything optional or nullable becomes a pointer with
 * `omitempty`. Each emitter states its own compromise rather than pretending the model
 * maps cleanly onto both.
 */

import { type JsonType, type NamedType, collectNamed, nameOf, pascalCase, splitNullable } from './infer'

export interface EmitOptions {
  rootName: string
  /** Go: represent optional and nullable fields as pointers. */
  goPointers: boolean
  /** TypeScript: emit `type X = {...}` instead of `interface X {...}`. */
  tsTypeAlias: boolean
}

const VALID_TS_KEY = /^[A-Za-z_$][A-Za-z0-9_$]*$/

// --- TypeScript ---

function tsType(type: JsonType, named: NamedType[]): string {
  const { type: bare, nullable } = splitNullable(type)
  // A value only ever seen as null carries no other evidence; `unknown | null` would be
  // noise dressed up as information.
  if (nullable && bare.kind === 'unknown') return 'null'
  const rendered = tsBare(bare, named)
  return nullable ? `${rendered} | null` : rendered
}

function tsBare(type: JsonType, named: NamedType[]): string {
  switch (type.kind) {
    case 'string':
      return 'string'
    case 'number':
      return 'number'
    case 'boolean':
      return 'boolean'
    case 'null':
      return 'null'
    case 'unknown':
      return 'unknown'
    case 'array': {
      const element = tsType(type.element, named)
      // A union element needs parentheses or the [] binds to the last member only.
      return /[|&]/.test(element) ? `(${element})[]` : `${element}[]`
    }
    case 'object':
      return nameOf(named, type) ?? 'Record<string, unknown>'
    case 'union':
      return type.options.map((option) => tsBare(option, named)).join(' | ')
  }
}

export function emitTypeScript(root: JsonType, options: EmitOptions): string {
  const named = collectNamed(root, options.rootName)
  if (!named.length) {
    return `export type ${pascalCase(options.rootName) || 'Root'} = ${tsType(root, named)}\n`
  }

  const blocks = named.map((entry) => {
    const body = entry.type.fields
      .map((field) => {
        const key = VALID_TS_KEY.test(field.key) ? field.key : JSON.stringify(field.key)
        return `  ${key}${field.optional ? '?' : ''}: ${tsType(field.type, named)}`
      })
      .join('\n')
    return options.tsTypeAlias
      ? `export type ${entry.name} = {\n${body}\n}`
      : `export interface ${entry.name} {\n${body}\n}`
  })

  // The root may be an array of the named shape rather than the shape itself.
  const rootRendered = tsType(root, named)
  if (rootRendered !== named[0].name) {
    blocks.push(`export type ${pascalCase(options.rootName) || 'Root'} = ${rootRendered}`)
  }
  return blocks.join('\n\n') + '\n'
}

// --- Go ---

/** Words gofmt and the linters expect fully capitalised in identifiers. */
const INITIALISMS = new Set([
  'ACL', 'API', 'ASCII', 'CPU', 'CSS', 'DNS', 'EOF', 'GUID', 'HTML', 'HTTP', 'HTTPS', 'ID', 'OK',
  'IP', 'JSON', 'LHS', 'QPS', 'RAM', 'RHS', 'RPC', 'SLA', 'SMTP', 'SQL', 'SSH', 'TCP', 'TLS',
  'TTL', 'UDP', 'UI', 'UID', 'URI', 'URL', 'UTF8', 'UUID', 'VM', 'XML', 'XSRF', 'XSS',
])

export function goFieldName(key: string): string {
  const parts = key
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .flatMap((part) => part.replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(' '))
    .filter(Boolean)
  if (!parts.length) return 'Field'
  const name = parts
    .map((part) => {
      const upper = part.toUpperCase()
      return INITIALISMS.has(upper) ? upper : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    })
    .join('')
  // Go identifiers cannot start with a digit.
  return /^[0-9]/.test(name) ? `F${name}` : name
}

function goType(type: JsonType, named: NamedType[], options: EmitOptions): { text: string; pointer: boolean } {
  const { type: bare, nullable } = splitNullable(type)
  const text = goBare(bare, named, options)
  // Slices, maps and any are already nil-able; pointing at them adds nothing.
  const selfNilable = text.startsWith('[]') || text.startsWith('map[') || text === 'any'
  return { text, pointer: nullable && options.goPointers && !selfNilable }
}

function goBare(type: JsonType, named: NamedType[], options: EmitOptions): string {
  switch (type.kind) {
    case 'string':
      return 'string'
    case 'number':
      return type.integer ? 'int64' : 'float64'
    case 'boolean':
      return 'bool'
    case 'null':
    case 'unknown':
      return 'any'
    case 'array': {
      const element = goType(type.element, named, options)
      return `[]${element.pointer ? '*' : ''}${element.text}`
    }
    case 'object':
      return nameOf(named, type) ?? 'map[string]any'
    case 'union':
      // Go has no sum type; `any` is the honest rendering.
      return 'any'
  }
}

export function emitGo(root: JsonType, options: EmitOptions): string {
  const named = collectNamed(root, options.rootName)
  if (!named.length) {
    const rendered = goType(root, named, options)
    return `type ${pascalCase(options.rootName) || 'Root'} ${rendered.pointer ? '*' : ''}${rendered.text}\n`
  }

  const blocks = named.map((entry) => {
    const rows = entry.type.fields.map((field) => {
      const rendered = goType(field.type, named, options)
      // An absent key and a zero value are different facts, and only a pointer can tell
      // them apart — so optional fields get one too, not just nullable ones.
      const selfNilable =
        rendered.text.startsWith('[]') || rendered.text.startsWith('map[') || rendered.text === 'any'
      const pointer = rendered.pointer || (field.optional && options.goPointers && !selfNilable)
      const omit = field.optional || pointer ? ',omitempty' : ''
      return {
        name: goFieldName(field.key),
        type: `${pointer ? '*' : ''}${rendered.text}`,
        tag: `\`json:"${field.key}${omit}"\``,
      }
    })
    // gofmt aligns the columns; matching that keeps the output paste-ready.
    const nameWidth = Math.max(0, ...rows.map((r) => r.name.length))
    const typeWidth = Math.max(0, ...rows.map((r) => r.type.length))
    const body = rows
      .map((r) => `\t${r.name.padEnd(nameWidth)} ${r.type.padEnd(typeWidth)} ${r.tag}`)
      .join('\n')
    return `type ${entry.name} struct {\n${body}\n}`
  })

  const rootRendered = goType(root, named, options)
  const rootText = `${rootRendered.pointer ? '*' : ''}${rootRendered.text}`
  if (rootText !== named[0].name) {
    blocks.push(`type ${pascalCase(options.rootName) || 'Root'} ${rootText}`)
  }
  return blocks.join('\n\n') + '\n'
}
