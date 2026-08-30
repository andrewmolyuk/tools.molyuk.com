/**
 * Infers a type model from one JSON sample.
 *
 * The whole difficulty is that a sample is evidence, not a specification. Two elements
 * of the same array may disagree — one carries a field, the next does not; one holds a
 * string, the next null. Merging is where that gets resolved, and getting it wrong is
 * how these tools produce types that do not survive the second API response.
 */

export type JsonType =
  | { kind: 'unknown' }
  | { kind: 'null' }
  | { kind: 'boolean' }
  | { kind: 'number'; integer: boolean }
  | { kind: 'string' }
  | { kind: 'array'; element: JsonType }
  | { kind: 'object'; fields: Field[] }
  | { kind: 'union'; options: JsonType[] }

export interface Field {
  key: string
  type: JsonType
  /** True when at least one observed object of this shape lacked the key. */
  optional: boolean
}

const UNKNOWN: JsonType = { kind: 'unknown' }
const NULL: JsonType = { kind: 'null' }

export function describe(value: unknown): JsonType {
  if (value === null) return NULL
  if (typeof value === 'boolean') return { kind: 'boolean' }
  if (typeof value === 'number') return { kind: 'number', integer: Number.isInteger(value) }
  if (typeof value === 'string') return { kind: 'string' }
  if (Array.isArray(value)) {
    // Every element is evidence about one element type, so fold them together.
    return { kind: 'array', element: value.map(describe).reduce(merge, UNKNOWN) }
  }
  if (typeof value === 'object') {
    return {
      kind: 'object',
      fields: Object.entries(value as Record<string, unknown>).map(([key, item]) => ({
        key,
        type: describe(item),
        optional: false,
      })),
    }
  }
  return UNKNOWN
}

function unionOf(options: JsonType[]): JsonType {
  const flat: JsonType[] = []
  for (const option of options) {
    if (option.kind === 'unknown') continue
    if (option.kind === 'union') flat.push(...option.options)
    else flat.push(option)
  }
  const seen: JsonType[] = []
  for (const option of flat) {
    if (!seen.some((existing) => same(existing, option))) seen.push(option)
  }
  if (!seen.length) return UNKNOWN
  if (seen.length === 1) return seen[0]
  return { kind: 'union', options: seen }
}

/** Structural equality, used to collapse repeats inside a union. */
export function same(a: JsonType, b: JsonType): boolean {
  if (a.kind !== b.kind) return false
  if (a.kind === 'number' && b.kind === 'number') return a.integer === b.integer
  if (a.kind === 'array' && b.kind === 'array') return same(a.element, b.element)
  if (a.kind === 'object' && b.kind === 'object') {
    if (a.fields.length !== b.fields.length) return false
    return a.fields.every((field) => {
      const other = b.fields.find((f) => f.key === field.key)
      return other !== undefined && other.optional === field.optional && same(other.type, field.type)
    })
  }
  if (a.kind === 'union' && b.kind === 'union') {
    return a.options.length === b.options.length && a.options.every((o) => b.options.some((x) => same(o, x)))
  }
  return true
}

export function merge(a: JsonType, b: JsonType): JsonType {
  if (a.kind === 'unknown') return b
  if (b.kind === 'unknown') return a
  if (same(a, b)) return a

  if (a.kind === 'number' && b.kind === 'number') {
    // One float among the samples makes the whole field a float.
    return { kind: 'number', integer: a.integer && b.integer }
  }
  if (a.kind === 'array' && b.kind === 'array') {
    return { kind: 'array', element: merge(a.element, b.element) }
  }
  if (a.kind === 'object' && b.kind === 'object') {
    const keys = [...new Set([...a.fields.map((f) => f.key), ...b.fields.map((f) => f.key)])]
    return {
      kind: 'object',
      fields: keys.map((key) => {
        const left = a.fields.find((f) => f.key === key)
        const right = b.fields.find((f) => f.key === key)
        if (!left) return { key, type: right!.type, optional: true }
        if (!right) return { key, type: left.type, optional: true }
        return {
          key,
          type: merge(left.type, right.type),
          optional: left.optional || right.optional,
        }
      }),
    }
  }
  return unionOf([a, b])
}

/** Splits a union into its non-null part and whether null was among the samples. */
export function splitNullable(type: JsonType): { type: JsonType; nullable: boolean } {
  if (type.kind === 'null') return { type: UNKNOWN, nullable: true }
  if (type.kind !== 'union') return { type, nullable: false }
  const rest = type.options.filter((option) => option.kind !== 'null')
  const nullable = rest.length !== type.options.length
  if (!rest.length) return { type: UNKNOWN, nullable }
  return { type: rest.length === 1 ? rest[0] : { kind: 'union', options: rest }, nullable }
}

// --- naming ---

/** Rough singularisation, enough to turn a JSON array key into an element type name. */
export function singular(word: string): string {
  if (/[^aeiou]ies$/i.test(word)) return word.slice(0, -3) + 'y'
  if (/(ss|sh|ch|x|z|s)es$/i.test(word)) return word.slice(0, -2)
  // "status", "address", "analysis" already are singular; stripping the s mangles them.
  if (/(us|ss|is)$/i.test(word)) return word
  if (/[^s]s$/i.test(word)) return word.slice(0, -1)
  return word
}

export function pascalCase(text: string): string {
  const parts = text.split(/[^A-Za-z0-9]+/).filter(Boolean)
  if (!parts.length) return ''
  return parts
    .flatMap((part) => part.replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(' '))
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

export interface NamedType {
  name: string
  type: Extract<JsonType, { kind: 'object' }>
}

/**
 * Walks the tree and gives every object shape a name, reusing one name for shapes that
 * are structurally identical — an array of a hundred identical records should produce a
 * single declaration, not a hundred.
 */
export function collectNamed(root: JsonType, rootName: string): NamedType[] {
  const named: NamedType[] = []
  const taken = new Set<string>()

  function nameFor(preferred: string): string {
    const base = pascalCase(preferred) || 'Type'
    if (!taken.has(base)) {
      taken.add(base)
      return base
    }
    for (let i = 2; ; i++) {
      const candidate = `${base}${i}`
      if (!taken.has(candidate)) {
        taken.add(candidate)
        return candidate
      }
    }
  }

  function visit(type: JsonType, preferred: string): void {
    if (type.kind === 'array') {
      // An element must not claim the name its container needs, or the output ends up
      // declaring `type Root = Root[]`, which does not compile.
      const child = singular(preferred)
      return visit(type.element, child === preferred ? `${preferred}Item` : child)
    }
    if (type.kind === 'union') {
      for (const option of type.options) visit(option, preferred)
      return
    }
    if (type.kind !== 'object') return

    const existing = named.find((entry) => same(entry.type, type))
    if (existing) return

    const name = nameFor(preferred)
    named.push({ name, type })
    for (const field of type.fields) visit(field.type, field.key)
  }

  visit(root, rootName)
  // Declarations read best with the root first, then its dependencies in discovery order.
  return named
}

export function nameOf(named: NamedType[], type: JsonType): string | null {
  return named.find((entry) => same(entry.type, type))?.name ?? null
}
