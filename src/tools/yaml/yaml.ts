/**
 * JSON ↔ YAML.
 *
 * Emitting YAML from JSON is exact: JSON's data model is a strict subset of YAML's, so
 * every value has a faithful representation.
 *
 * Reading YAML is the hard direction — the full spec has anchors, aliases, tags, complex
 * keys, multiple documents and several scalar folding modes, and a parser that quietly
 * mishandles them is worse than one that refuses. So this reads the common subset and
 * throws `YamlUnsupported` by name on anything outside it, rather than guessing.
 */

export class YamlError extends Error {
  line: number

  constructor(message: string, line: number) {
    super(message)
    this.line = line
  }
}

export class YamlUnsupported extends YamlError {}

// --- emitting ---

const PLAIN_SAFE = /^[A-Za-z_][A-Za-z0-9_\-.]*$/
/** Scalars that YAML would otherwise read as a boolean, null or number if left bare. */
const RESERVED = /^(y|Y|yes|Yes|YES|n|N|no|No|NO|true|True|TRUE|false|False|FALSE|on|On|ON|off|Off|OFF|null|Null|NULL|~)$/

function quote(text: string): string {
  return `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\t/g, '\\t')}"`
}

function scalar(value: unknown): string {
  if (value === null) return 'null'
  if (typeof value === 'boolean' || typeof value === 'number') {
    return Number.isFinite(value as number) || typeof value === 'boolean' ? String(value) : quote(String(value))
  }
  const text = String(value)
  if (text === '') return "''"
  if (!PLAIN_SAFE.test(text) || RESERVED.test(text)) return quote(text)
  return text
}

function key(name: string): string {
  return PLAIN_SAFE.test(name) && !RESERVED.test(name) ? name : quote(name)
}

export function toYaml(value: unknown, indent = 0): string {
  const pad = '  '.repeat(indent)

  if (Array.isArray(value)) {
    if (!value.length) return `${pad}[]`
    return value
      .map((item) => {
        if (item !== null && typeof item === 'object') {
          const nested = toYaml(item, indent + 1)
          // Hoist the first line up onto the dash so the block reads as one item.
          return `${pad}- ${nested.slice((indent + 1) * 2)}`
        }
        return `${pad}- ${scalar(item)}`
      })
      .join('\n')
  }

  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    if (!entries.length) return `${pad}{}`
    return entries
      .map(([name, item]) => {
        if (item !== null && typeof item === 'object' && Object.keys(item).length) {
          return `${pad}${key(name)}:\n${toYaml(item, indent + 1)}`
        }
        if (item !== null && typeof item === 'object') {
          return `${pad}${key(name)}: ${Array.isArray(item) ? '[]' : '{}'}`
        }
        return `${pad}${key(name)}: ${scalar(item)}`
      })
      .join('\n')
  }

  return `${pad}${scalar(value)}`
}

// --- reading ---

interface Line {
  indent: number
  content: string
  number: number
}

function parseScalar(raw: string, lineNumber: number): unknown {
  const text = raw.trim()
  if (text === '' || text === '~' || text === 'null' || text === 'Null' || text === 'NULL') return null
  if (/^(true|True|TRUE)$/.test(text)) return true
  if (/^(false|False|FALSE)$/.test(text)) return false

  if (text.startsWith('"')) {
    if (!text.endsWith('"') || text.length < 2) throw new YamlError(text, lineNumber)
    return text
      .slice(1, -1)
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
  }
  if (text.startsWith("'")) {
    if (!text.endsWith("'") || text.length < 2) throw new YamlError(text, lineNumber)
    return text.slice(1, -1).replace(/''/g, "'")
  }

  // Flow collections are handed to JSON.parse, which accepts the JSON-compatible forms.
  if (text.startsWith('[') || text.startsWith('{')) {
    try {
      return JSON.parse(text.replace(/'/g, '"'))
    } catch {
      throw new YamlUnsupported(text, lineNumber)
    }
  }

  if (/^-?\d+$/.test(text)) return Number(text)
  if (/^-?\d*\.\d+([eE][+-]?\d+)?$/.test(text) || /^-?\d+[eE][+-]?\d+$/.test(text)) return Number(text)

  if (text.startsWith('&') || text.startsWith('*') || text.startsWith('!')) {
    throw new YamlUnsupported(text, lineNumber)
  }
  if (text === '|' || text === '>' || text.startsWith('|') || text.startsWith('>')) {
    throw new YamlUnsupported(text, lineNumber)
  }
  return text
}

/**
 * Cuts a trailing comment. Must track quote state: a `#` inside a quoted scalar is
 * ordinary text, and a regex that ignores that turns `a: "x # y"` into an unterminated
 * string.
 */
function stripComment(raw: string): string {
  let quoteChar: string | null = null
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]
    if (quoteChar) {
      if (ch === '\\' && quoteChar === '"') i++
      else if (ch === quoteChar) quoteChar = null
      continue
    }
    if (ch === '"' || ch === "'") {
      quoteChar = ch
      continue
    }
    if (ch === '#' && (i === 0 || /\s/.test(raw[i - 1]))) return raw.slice(0, i)
  }
  return raw
}

/** Splits `key: value`, ignoring a colon that sits inside quotes. */
function splitKey(content: string): { name: string; rest: string } | null {
  let quoteChar: string | null = null
  for (let i = 0; i < content.length; i++) {
    const ch = content[i]
    if (quoteChar) {
      if (ch === quoteChar) quoteChar = null
      continue
    }
    if (ch === '"' || ch === "'") {
      quoteChar = ch
      continue
    }
    if (ch === ':' && (i + 1 === content.length || /[\s]/.test(content[i + 1]))) {
      return { name: content.slice(0, i).trim(), rest: content.slice(i + 1).trim() }
    }
  }
  return null
}

function unquoteKey(name: string): string {
  if ((name.startsWith('"') && name.endsWith('"')) || (name.startsWith("'") && name.endsWith("'"))) {
    return name.slice(1, -1)
  }
  return name
}

export function fromYaml(text: string): unknown {
  const lines: Line[] = []
  text.replace(/\r\n?/g, '\n').split('\n').forEach((raw, i) => {
    const number = i + 1
    if (raw.trim().startsWith('---') || raw.trim().startsWith('...')) {
      if (lines.length) throw new YamlUnsupported(raw.trim(), number)
      return
    }
    const stripped = stripComment(raw).replace(/\s+$/, '')
    if (!stripped.trim()) return
    if (stripped.includes('\t')) throw new YamlError(stripped, number)
    lines.push({ indent: stripped.length - stripped.trimStart().length, content: stripped.trim(), number })
  })

  if (!lines.length) return null

  let cursor = 0

  function parseBlock(indent: number): unknown {
    const first = lines[cursor]
    return first.content.startsWith('- ') || first.content === '-'
      ? parseSequence(indent)
      : parseMapping(indent)
  }

  function parseSequence(indent: number): unknown[] {
    const out: unknown[] = []
    while (cursor < lines.length && lines[cursor].indent === indent) {
      const line = lines[cursor]
      if (!(line.content.startsWith('- ') || line.content === '-')) break
      const rest = line.content === '-' ? '' : line.content.slice(2).trim()
      cursor++

      if (rest === '') {
        out.push(cursor < lines.length && lines[cursor].indent > indent ? parseBlock(lines[cursor].indent) : null)
        continue
      }
      // "- key: value" opens a mapping whose remaining keys are indented past the dash.
      const pair = splitKey(rest)
      if (pair) {
        const inner: Record<string, unknown> = {}
        inner[unquoteKey(pair.name)] =
          pair.rest === ''
            ? cursor < lines.length && lines[cursor].indent > indent
              ? parseBlock(lines[cursor].indent)
              : null
            : parseScalar(pair.rest, line.number)
        while (cursor < lines.length && lines[cursor].indent > indent && !lines[cursor].content.startsWith('- ')) {
          const nested = lines[cursor]
          const nestedPair = splitKey(nested.content)
          if (!nestedPair) throw new YamlError(nested.content, nested.number)
          cursor++
          inner[unquoteKey(nestedPair.name)] =
            nestedPair.rest === ''
              ? cursor < lines.length && lines[cursor].indent > nested.indent
                ? parseBlock(lines[cursor].indent)
                : null
              : parseScalar(nestedPair.rest, nested.number)
        }
        out.push(inner)
        continue
      }
      out.push(parseScalar(rest, line.number))
    }
    return out
  }

  function parseMapping(indent: number): Record<string, unknown> {
    const out: Record<string, unknown> = {}
    while (cursor < lines.length && lines[cursor].indent === indent) {
      const line = lines[cursor]
      if (line.content.startsWith('- ')) break
      const pair = splitKey(line.content)
      if (!pair) throw new YamlError(line.content, line.number)
      cursor++
      const name = unquoteKey(pair.name)
      if (pair.rest === '') {
        out[name] =
          cursor < lines.length && lines[cursor].indent > indent ? parseBlock(lines[cursor].indent) : null
      } else {
        out[name] = parseScalar(pair.rest, line.number)
      }
    }
    return out
  }

  const result = parseBlock(lines[0].indent)
  if (cursor < lines.length) throw new YamlError(lines[cursor].content, lines[cursor].number)
  return result
}
