/**
 * HTML entity encode/decode.
 *
 * Decoding deliberately avoids the usual innerHTML trick: handing arbitrary input to the
 * HTML parser to read the text back out is a habit worth not building, and the textarea
 * variant of it silently truncates on a `</textarea>` in the input. A table plus the
 * numeric forms is explicit, testable, and cannot execute anything.
 *
 * The named table is the common subset, not all ~2200 HTML5 entities — that list would
 * outweigh the rest of the site. Unknown entities are left untouched rather than mangled.
 */

const NAMED: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  copy: '©', reg: '®', trade: '™', deg: '°', plusmn: '±', sup2: '²', sup3: '³',
  micro: 'µ', para: '¶', middot: '·', frac14: '¼', frac12: '½', frac34: '¾',
  times: '×', divide: '÷', ne: '≠', le: '≤', ge: '≥', minus: '−',
  ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
  sbquo: '‚', bdquo: '„', dagger: '†', Dagger: '‡', bull: '•', hellip: '…',
  permil: '‰', prime: '′', Prime: '″', lsaquo: '‹', rsaquo: '›', oline: '‾',
  euro: '€', pound: '£', yen: '¥', cent: '¢', curren: '¤', sect: '§', uml: '¨',
  ordf: 'ª', laquo: '«', not: '¬', shy: '­', macr: '¯', acute: '´', cedil: '¸',
  ordm: 'º', raquo: '»', iquest: '¿', iexcl: '¡', brvbar: '¦', sup1: '¹',
  larr: '←', uarr: '↑', rarr: '→', darr: '↓', harr: '↔', crarr: '↵',
  lArr: '⇐', uArr: '⇑', rArr: '⇒', dArr: '⇓', hArr: '⇔',
  forall: '∀', part: '∂', exist: '∃', empty: '∅', nabla: '∇', isin: '∈', notin: '∉',
  ni: '∋', prod: '∏', sum: '∑', lowast: '∗', radic: '√', prop: '∝', infin: '∞',
  ang: '∠', and: '∧', or: '∨', cap: '∩', cup: '∪', int: '∫', there4: '∴',
  sim: '∼', cong: '≅', asymp: '≈', equiv: '≡', sub: '⊂', supset: '⊃', nsub: '⊄',
  sube: '⊆', supe: '⊇', oplus: '⊕', otimes: '⊗', perp: '⊥', sdot: '⋅',
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', zeta: 'ζ', eta: 'η',
  theta: 'θ', iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ',
  omicron: 'ο', pi: 'π', rho: 'ρ', sigmaf: 'ς', sigma: 'σ', tau: 'τ', upsilon: 'υ',
  phi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
  Alpha: 'Α', Beta: 'Β', Gamma: 'Γ', Delta: 'Δ', Epsilon: 'Ε', Zeta: 'Ζ', Eta: 'Η',
  Theta: 'Θ', Iota: 'Ι', Kappa: 'Κ', Lambda: 'Λ', Mu: 'Μ', Nu: 'Ν', Xi: 'Ξ',
  Omicron: 'Ο', Pi: 'Π', Rho: 'Ρ', Sigma: 'Σ', Tau: 'Τ', Upsilon: 'Υ',
  Phi: 'Φ', Chi: 'Χ', Psi: 'Ψ', Omega: 'Ω',
  agrave: 'à', aacute: 'á', acirc: 'â', atilde: 'ã', auml: 'ä', aring: 'å', aelig: 'æ',
  ccedil: 'ç', egrave: 'è', eacute: 'é', ecirc: 'ê', euml: 'ë', igrave: 'ì', iacute: 'í',
  icirc: 'î', iuml: 'ï', eth: 'ð', ntilde: 'ñ', ograve: 'ò', oacute: 'ó', ocirc: 'ô',
  otilde: 'õ', ouml: 'ö', oslash: 'ø', ugrave: 'ù', uacute: 'ú', ucirc: 'û', uuml: 'ü',
  yacute: 'ý', thorn: 'þ', yuml: 'ÿ', szlig: 'ß',
  Agrave: 'À', Aacute: 'Á', Acirc: 'Â', Atilde: 'Ã', Auml: 'Ä', Aring: 'Å', AElig: 'Æ',
  Ccedil: 'Ç', Egrave: 'È', Eacute: 'É', Ecirc: 'Ê', Euml: 'Ë', Igrave: 'Ì', Iacute: 'Í',
  Icirc: 'Î', Iuml: 'Ï', ETH: 'Ð', Ntilde: 'Ñ', Ograve: 'Ò', Oacute: 'Ó', Ocirc: 'Ô',
  Otilde: 'Õ', Ouml: 'Ö', Oslash: 'Ø', Ugrave: 'Ù', Uacute: 'Ú', Ucirc: 'Û', Uuml: 'Ü',
  Yacute: 'Ý', THORN: 'Þ',
  ensp: ' ', emsp: ' ', thinsp: ' ', zwnj: '‌', zwj: '‍',
  lrm: '‎', rlm: '‏',
}

/** The five that must be escaped for markup to stay markup. */
const ESCAPE: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export type EncodeMode = 'minimal' | 'named' | 'numeric'

const NAME_BY_CHAR = new Map(
  Object.entries(NAMED)
    .reverse() // earlier entries win, so the canonical names beat the aliases
    .map(([name, char]) => [char, name]),
)

export function encodeEntities(text: string, mode: EncodeMode): string {
  let out = ''
  for (const char of text) {
    if (ESCAPE[char]) {
      out += ESCAPE[char]
      continue
    }
    if (mode === 'minimal' || char.codePointAt(0)! < 0x80) {
      out += char
      continue
    }
    const name = mode === 'named' ? NAME_BY_CHAR.get(char) : undefined
    out += name ? `&${name};` : `&#${char.codePointAt(0)};`
  }
  return out
}

export function decodeEntities(text: string): string {
  return text.replace(/&(#[xX][0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]*);/g, (whole, body: string) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X'
        ? parseInt(body.slice(2), 16)
        : parseInt(body.slice(1), 10)
      // Surrogates and out-of-range values have no character to become; leave them alone
      // rather than throwing or emitting U+FFFD.
      if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return whole
      if (code >= 0xd800 && code <= 0xdfff) return whole
      return String.fromCodePoint(code)
    }
    return NAMED[body] ?? whole
  })
}

export const NAMED_COUNT = Object.keys(NAMED).length
