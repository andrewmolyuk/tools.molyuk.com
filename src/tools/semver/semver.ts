/**
 * Semantic versioning: parsing, precedence and range satisfaction.
 *
 * Two rules carry most of the surprise and both are implemented literally from the spec.
 * A pre-release version has *lower* precedence than the release it precedes, so 1.0.0-rc
 * sorts before 1.0.0. And a range never matches a pre-release unless the range itself
 * names one with the same version triple — otherwise `^1.0.0` would quietly pull in
 * `2.0.0-beta`, which is the bug this rule exists to prevent.
 */

export interface Version {
  major: number
  minor: number
  patch: number
  prerelease: (string | number)[]
  build: string[]
  raw: string
}

const VERSION = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/

export function parse(input: string): Version | null {
  const match = VERSION.exec(input.trim())
  if (!match) return null
  const [, major, minor, patch, prerelease, build] = match
  return {
    major: Number(major),
    minor: Number(minor),
    patch: Number(patch),
    prerelease: prerelease ? prerelease.split('.').map((p) => (/^\d+$/.test(p) ? Number(p) : p)) : [],
    build: build ? build.split('.') : [],
    raw: input.trim(),
  }
}

/** Precedence per the spec: -1, 0 or 1. Build metadata is ignored entirely. */
export function compare(a: Version, b: Version): number {
  for (const key of ['major', 'minor', 'patch'] as const) {
    if (a[key] !== b[key]) return a[key] < b[key] ? -1 : 1
  }
  // A version without a pre-release outranks one with it.
  if (!a.prerelease.length && b.prerelease.length) return 1
  if (a.prerelease.length && !b.prerelease.length) return -1

  const length = Math.max(a.prerelease.length, b.prerelease.length)
  for (let i = 0; i < length; i++) {
    const left = a.prerelease[i]
    const right = b.prerelease[i]
    // A shorter set of identifiers has lower precedence when all preceding ones are equal.
    if (left === undefined) return -1
    if (right === undefined) return 1
    if (left === right) continue
    const leftNumeric = typeof left === 'number'
    const rightNumeric = typeof right === 'number'
    // Numeric identifiers always rank lower than alphanumeric ones.
    if (leftNumeric && !rightNumeric) return -1
    if (!leftNumeric && rightNumeric) return 1
    return left < right ? -1 : 1
  }
  return 0
}

export function equal(a: Version, b: Version): boolean {
  return compare(a, b) === 0
}

// --- ranges ---

type Operator = '=' | '<' | '<=' | '>' | '>='

interface Comparator {
  operator: Operator
  version: Version
}

const COMPARATOR = /^(>=|<=|>|<|=|)\s*(.+)$/

function expandPartial(text: string): { lower: Version; upper: Version | null } | null {
  // Accepts 1, 1.2 and 1.2.3, plus x/X/* in place of a number.
  const cleaned = text.trim().replace(/^v/, '')
  if (cleaned === '' || cleaned === '*' || cleaned === 'x' || cleaned === 'X') {
    return { lower: parse('0.0.0')!, upper: null }
  }
  const parts = cleaned.split('.')
  const numbers: number[] = []
  for (const part of parts) {
    if (/^[xX*]$/.test(part)) break
    if (!/^\d+$/.test(part)) return null
    numbers.push(Number(part))
  }
  if (!numbers.length) return { lower: parse('0.0.0')!, upper: null }

  const [major, minor, patch] = numbers
  const lower = parse(`${major}.${minor ?? 0}.${patch ?? 0}`)
  if (!lower) return null
  if (numbers.length === 3) return { lower, upper: null }
  const upper = numbers.length === 1 ? parse(`${major + 1}.0.0`) : parse(`${major}.${minor + 1}.0`)
  return { lower, upper }
}

function caretRange(version: Version): Comparator[] {
  // ^ allows changes that do not modify the left-most non-zero element.
  const upper =
    version.major !== 0
      ? parse(`${version.major + 1}.0.0`)!
      : version.minor !== 0
        ? parse(`0.${version.minor + 1}.0`)!
        : parse(`0.0.${version.patch + 1}`)!
  return [
    { operator: '>=', version },
    { operator: '<', version: upper },
  ]
}

function tildeRange(version: Version, specified: number): Comparator[] {
  // ~ allows patch-level changes when a minor is given, minor-level changes otherwise.
  const upper = specified >= 2 ? parse(`${version.major}.${version.minor + 1}.0`)! : parse(`${version.major + 1}.0.0`)!
  return [
    { operator: '>=', version },
    { operator: '<', version: upper },
  ]
}

function parseComparatorSet(text: string): Comparator[] | null {
  const tokens = text.trim().split(/\s+/).filter(Boolean)
  const out: Comparator[] = []

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]

    // Hyphen range: "1.2.3 - 2.3.4".
    if (tokens[i + 1] === '-' && tokens[i + 2]) {
      const from = expandPartial(token)
      const to = expandPartial(tokens[i + 2])
      if (!from || !to) return null
      out.push({ operator: '>=', version: from.lower })
      if (to.upper) out.push({ operator: '<', version: to.upper })
      else out.push({ operator: '<=', version: to.lower })
      i += 2
      continue
    }

    if (token.startsWith('^')) {
      const version = parse(token.slice(1)) ?? expandPartial(token.slice(1))?.lower
      if (!version) return null
      out.push(...caretRange(version))
      continue
    }
    if (token.startsWith('~')) {
      const body = token.slice(1)
      const version = parse(body) ?? expandPartial(body)?.lower
      if (!version) return null
      out.push(...tildeRange(version, body.replace(/^v/, '').split('.').length))
      continue
    }

    const match = COMPARATOR.exec(token)
    if (!match) return null
    const [, operator, rest] = match
    const exact = parse(rest)
    if (exact) {
      out.push({ operator: (operator || '=') as Operator, version: exact })
      continue
    }
    // A partial like "1.2" becomes a bounded range rather than an equality.
    const partial = expandPartial(rest)
    if (!partial) return null
    if (!operator || operator === '=') {
      out.push({ operator: '>=', version: partial.lower })
      if (partial.upper) out.push({ operator: '<', version: partial.upper })
    } else {
      out.push({ operator: operator as Operator, version: partial.lower })
    }
  }
  return out.length ? out : null
}

export function parseRange(input: string): Comparator[][] | null {
  const sets = input.split('||').map((part) => parseComparatorSet(part))
  if (sets.some((set) => set === null)) return null
  return sets as Comparator[][]
}

function satisfiesComparator(version: Version, comparator: Comparator): boolean {
  const result = compare(version, comparator.version)
  switch (comparator.operator) {
    case '=':
      return result === 0
    case '>':
      return result > 0
    case '>=':
      return result >= 0
    case '<':
      return result < 0
    case '<=':
      return result <= 0
  }
}

export function satisfies(version: Version, range: string): boolean | null {
  const sets = parseRange(range)
  if (!sets) return null

  return sets.some((set) => {
    if (!set.every((comparator) => satisfiesComparator(version, comparator))) return false
    if (!version.prerelease.length) return true
    // A pre-release only qualifies when some comparator names the same triple with its
    // own pre-release; otherwise ^1.0.0 would match 2.0.0-beta.
    return set.some(
      (comparator) =>
        comparator.version.prerelease.length &&
        comparator.version.major === version.major &&
        comparator.version.minor === version.minor &&
        comparator.version.patch === version.patch,
    )
  })
}

export function sort(versions: Version[]): Version[] {
  return [...versions].sort(compare)
}

export function format(version: Version): string {
  const pre = version.prerelease.length ? `-${version.prerelease.join('.')}` : ''
  const build = version.build.length ? `+${version.build.join('.')}` : ''
  return `${version.major}.${version.minor}.${version.patch}${pre}${build}`
}

export type Bump = 'major' | 'minor' | 'patch'

export function bump(version: Version, kind: Bump): Version {
  if (kind === 'major') return parse(`${version.major + 1}.0.0`)!
  if (kind === 'minor') return parse(`${version.major}.${version.minor + 1}.0`)!
  return parse(`${version.major}.${version.minor}.${version.patch + 1}`)!
}
