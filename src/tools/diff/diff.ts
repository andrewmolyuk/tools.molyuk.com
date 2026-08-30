/**
 * Line diff over the longest common subsequence.
 *
 * The DP table is O(n×m), which is why the line count is capped: at the cap it is a
 * 4M-entry Uint32Array (16 MB), and past that a browser tab is the wrong place for the
 * job anyway. Callers get a truthful `truncated` flag rather than a silently short diff.
 */

export const MAX_LINES = 2000

export type Op = 'equal' | 'insert' | 'delete'

export interface DiffLine {
  op: Op
  text: string
  /** 1-based line numbers in each side; null where the line does not exist there. */
  leftNumber: number | null
  rightNumber: number | null
}

export interface DiffResult {
  lines: DiffLine[]
  added: number
  removed: number
  unchanged: number
  truncated: boolean
}

export interface DiffOptions {
  ignoreCase?: boolean
  ignoreWhitespace?: boolean
  /** Collapse runs of unchanged lines, keeping this many around each change. */
  context?: number | null
}

function normalize(line: string, options: DiffOptions): string {
  let out = line
  if (options.ignoreWhitespace) out = out.trim().replace(/\s+/g, ' ')
  if (options.ignoreCase) out = out.toLowerCase()
  return out
}

function splitLines(text: string): string[] {
  if (text === '') return []
  return text.replace(/\r\n?/g, '\n').split('\n')
}

export function diffLines(leftText: string, rightText: string, options: DiffOptions = {}): DiffResult {
  const allLeft = splitLines(leftText)
  const allRight = splitLines(rightText)
  const truncated = allLeft.length > MAX_LINES || allRight.length > MAX_LINES
  const left = allLeft.slice(0, MAX_LINES)
  const right = allRight.slice(0, MAX_LINES)

  const a = left.map((line) => normalize(line, options))
  const b = right.map((line) => normalize(line, options))
  const n = a.length
  const m = b.length

  // lcs[i][j] = length of the LCS of a[i..] and b[j..], stored flat.
  const width = m + 1
  const lcs = new Uint32Array((n + 1) * width)
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i * width + j] =
        a[i] === b[j]
          ? lcs[(i + 1) * width + j + 1] + 1
          : Math.max(lcs[(i + 1) * width + j], lcs[i * width + j + 1])
    }
  }

  const lines: DiffLine[] = []
  let added = 0
  let removed = 0
  let unchanged = 0
  let i = 0
  let j = 0

  while (i < n && j < m) {
    if (a[i] === b[j]) {
      lines.push({ op: 'equal', text: left[i], leftNumber: i + 1, rightNumber: j + 1 })
      unchanged++
      i++
      j++
    } else if (lcs[(i + 1) * width + j] >= lcs[i * width + j + 1]) {
      lines.push({ op: 'delete', text: left[i], leftNumber: i + 1, rightNumber: null })
      removed++
      i++
    } else {
      lines.push({ op: 'insert', text: right[j], leftNumber: null, rightNumber: j + 1 })
      added++
      j++
    }
  }
  while (i < n) {
    lines.push({ op: 'delete', text: left[i], leftNumber: i + 1, rightNumber: null })
    removed++
    i++
  }
  while (j < m) {
    lines.push({ op: 'insert', text: right[j], leftNumber: null, rightNumber: j + 1 })
    added++
    j++
  }

  return { lines, added, removed, unchanged, truncated }
}

export interface Hunk {
  lines: DiffLine[]
  /** Unchanged lines dropped immediately before this hunk. */
  skipped: number
}

/** Groups the diff into hunks with `context` unchanged lines around each change. */
export function toHunks(lines: DiffLine[], context: number): Hunk[] {
  const keep = new Array<boolean>(lines.length).fill(false)
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].op === 'equal') continue
    for (let k = Math.max(0, i - context); k <= Math.min(lines.length - 1, i + context); k++) {
      keep[k] = true
    }
  }

  const hunks: Hunk[] = []
  let current: DiffLine[] = []
  let skipped = 0
  let pendingSkip = 0

  for (let i = 0; i < lines.length; i++) {
    if (keep[i]) {
      if (!current.length) skipped = pendingSkip
      current.push(lines[i])
      pendingSkip = 0
    } else {
      pendingSkip++
      if (current.length) {
        hunks.push({ lines: current, skipped })
        current = []
      }
    }
  }
  if (current.length) hunks.push({ lines: current, skipped })
  return hunks
}

/** Unified-diff text, the format that can be pasted into a patch or a review. */
export function toUnified(result: DiffResult): string {
  const sign = { equal: ' ', insert: '+', delete: '-' } as const
  return result.lines.map((line) => sign[line.op] + line.text).join('\n')
}
