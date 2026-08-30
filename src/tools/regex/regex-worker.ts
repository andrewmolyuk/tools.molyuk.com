/**
 * Runs the user's regex off the main thread.
 *
 * A pattern like /(a+)+b/ against a few dozen "a"s backtracks for longer than anyone
 * will wait, and there is no way to interrupt a regex once the engine is inside it. In a
 * worker the main thread stays responsive and the page can terminate this thread on a
 * timeout, which is the only reliable way out.
 */

export interface RegexRequest {
  pattern: string
  flags: string
  input: string
  replacement: string | null
}

export interface RegexMatch {
  index: number
  match: string
  groups: (string | undefined)[]
  named: Record<string, string | undefined>
}

export type RegexResponse =
  | { ok: true; matches: RegexMatch[]; truncated: boolean; replaced: string | null }
  | { ok: false; error: string }

/** Beyond this the table is unreadable anyway, and the payload starts to cost more than it tells. */
const MAX_MATCHES = 500

self.onmessage = (event: MessageEvent<RegexRequest>) => {
  const { pattern, flags, input, replacement } = event.data

  let regex: RegExp
  try {
    regex = new RegExp(pattern, flags)
  } catch (e) {
    const response: RegexResponse = { ok: false, error: e instanceof Error ? e.message : String(e) }
    self.postMessage(response)
    return
  }

  try {
    const matches: RegexMatch[] = []
    let truncated = false

    const collect = (m: RegExpMatchArray) => {
      matches.push({
        index: m.index ?? 0,
        match: m[0],
        groups: m.slice(1),
        named: { ...m.groups },
      })
    }

    if (flags.includes('g')) {
      // matchAll advances past zero-length matches on its own, so /a*/g cannot spin here.
      for (const m of input.matchAll(regex)) {
        if (matches.length >= MAX_MATCHES) {
          truncated = true
          break
        }
        collect(m)
      }
    } else {
      const m = regex.exec(input)
      if (m) collect(m)
    }

    const replaced = replacement === null ? null : input.replace(regex, replacement)
    const response: RegexResponse = { ok: true, matches, truncated, replaced }
    self.postMessage(response)
  } catch (e) {
    const response: RegexResponse = { ok: false, error: e instanceof Error ? e.message : String(e) }
    self.postMessage(response)
  }
}
