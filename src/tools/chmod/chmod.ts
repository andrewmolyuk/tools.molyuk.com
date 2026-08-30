/**
 * Unix permission bits, both directions.
 *
 * The part worth being careful about is the special bits: setuid, setgid and sticky are
 * shown by replacing the execute character of their class, and the letter's case says
 * whether execute is also set — `s` means both, `S` means the special bit alone. A
 * converter that ignores the case silently loses a bit.
 */

export interface Permissions {
  /** 0–7 per class. */
  user: number
  group: number
  other: number
  setuid: boolean
  setgid: boolean
  sticky: boolean
}

export const CLASSES = ['user', 'group', 'other'] as const
export type ClassName = (typeof CLASSES)[number]

export class ChmodError extends Error {}

export function toOctal(perms: Permissions): string {
  const special = (perms.setuid ? 4 : 0) | (perms.setgid ? 2 : 0) | (perms.sticky ? 1 : 0)
  return `${special}${perms.user}${perms.group}${perms.other}`
}

export function toSymbolic(perms: Permissions): string {
  const triple = (bits: number, special: boolean, specialChar: string) => {
    const r = bits & 4 ? 'r' : '-'
    const w = bits & 2 ? 'w' : '-'
    const executable = (bits & 1) !== 0
    let x: string
    if (special) x = executable ? specialChar : specialChar.toUpperCase()
    else x = executable ? 'x' : '-'
    return r + w + x
  }
  return (
    triple(perms.user, perms.setuid, 's') +
    triple(perms.group, perms.setgid, 's') +
    triple(perms.other, perms.sticky, 't')
  )
}

function parseOctal(text: string): Permissions {
  const digits = text.padStart(4, '0')
  if (digits.length > 4 || !/^[0-7]{4}$/.test(digits)) throw new ChmodError(text)
  const special = Number(digits[0])
  return {
    user: Number(digits[1]),
    group: Number(digits[2]),
    other: Number(digits[3]),
    setuid: (special & 4) !== 0,
    setgid: (special & 2) !== 0,
    sticky: (special & 1) !== 0,
  }
}

function parseSymbolic(text: string): Permissions {
  // `ls -l` prefixes a file-type character; accept and ignore it.
  const body = text.length === 10 ? text.slice(1) : text
  if (body.length !== 9) throw new ChmodError(text)

  const readTriple = (chunk: string, specialChar: string) => {
    const [r, w, x] = chunk
    if (r !== 'r' && r !== '-') throw new ChmodError(chunk)
    if (w !== 'w' && w !== '-') throw new ChmodError(chunk)

    let bits = (r === 'r' ? 4 : 0) | (w === 'w' ? 2 : 0)
    let special = false
    if (x === 'x') bits |= 1
    else if (x === specialChar) {
      // Lower case: the special bit and execute. Upper case: the special bit alone.
      bits |= 1
      special = true
    } else if (x === specialChar.toUpperCase()) special = true
    else if (x !== '-') throw new ChmodError(chunk)
    return { bits, special }
  }

  const user = readTriple(body.slice(0, 3), 's')
  const group = readTriple(body.slice(3, 6), 's')
  const other = readTriple(body.slice(6, 9), 't')
  return {
    user: user.bits,
    group: group.bits,
    other: other.bits,
    setuid: user.special,
    setgid: group.special,
    sticky: other.special,
  }
}

export function parse(input: string): Permissions {
  const text = input.trim()
  if (!text) throw new ChmodError(text)
  if (/^[0-7]{3,4}$/.test(text)) return parseOctal(text)
  if (/^[-dlbcps]?[rwxsStT-]{9}$/.test(text)) return parseSymbolic(text)
  throw new ChmodError(text)
}

export interface ClassRow {
  name: ClassName
  read: boolean
  write: boolean
  execute: boolean
}

export function rows(perms: Permissions): ClassRow[] {
  return CLASSES.map((name) => {
    const bits = perms[name]
    return { name, read: (bits & 4) !== 0, write: (bits & 2) !== 0, execute: (bits & 1) !== 0 }
  })
}

export function fromRows(rows: ClassRow[], special: Pick<Permissions, 'setuid' | 'setgid' | 'sticky'>): Permissions {
  const bitsOf = (name: ClassName) => {
    const row = rows.find((r) => r.name === name)!
    return (row.read ? 4 : 0) | (row.write ? 2 : 0) | (row.execute ? 1 : 0)
  }
  return { user: bitsOf('user'), group: bitsOf('group'), other: bitsOf('other'), ...special }
}

/** What the mode actually means, in the cases people look this up to check. */
export function notes(perms: Permissions): string[] {
  const keys: string[] = []
  if (perms.setuid) keys.push('setuid')
  if (perms.setgid) keys.push('setgid')
  if (perms.sticky) keys.push('sticky')
  if (perms.other & 2) keys.push('worldWritable')
  if (toOctal(perms) === '0777') keys.push('allPermissions')
  if ((perms.group & 6) === 0 && (perms.other & 6) === 0 && perms.user === 6) keys.push('privateFile')
  return keys
}

export const PRESETS: { octal: string; key: string }[] = [
  { octal: '644', key: 'file' },
  { octal: '755', key: 'executable' },
  { octal: '600', key: 'private' },
  { octal: '700', key: 'privateDir' },
  { octal: '775', key: 'groupWritable' },
  { octal: '777', key: 'everything' },
  { octal: '1777', key: 'tmp' },
  { octal: '4755', key: 'setuidBinary' },
]
