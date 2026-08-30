/**
 * Colour conversion between the formats a front-end actually types: hex, rgb(), hsl()
 * and oklch(). OKLCH is included because it is what modern CSS reaches for when a
 * palette needs even perceived lightness, which HSL famously does not give.
 */

export interface Rgb {
  r: number // 0–255
  g: number
  b: number
  a: number // 0–1
}

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max)
const round = (n: number, places = 0) => {
  const f = 10 ** places
  return Math.round(n * f) / f
}

// --- parsing ---

function parseHex(text: string): Rgb | null {
  const body = text.slice(1)
  const valid = /^[0-9a-fA-F]+$/.test(body)
  if (!valid) return null
  const expand = (c: string) => parseInt(c + c, 16)
  if (body.length === 3 || body.length === 4) {
    return {
      r: expand(body[0]),
      g: expand(body[1]),
      b: expand(body[2]),
      a: body.length === 4 ? expand(body[3]) / 255 : 1,
    }
  }
  if (body.length === 6 || body.length === 8) {
    const pair = (i: number) => parseInt(body.slice(i, i + 2), 16)
    return { r: pair(0), g: pair(2), b: pair(4), a: body.length === 8 ? pair(6) / 255 : 1 }
  }
  return null
}

/**
 * Handles both the legacy comma syntax `rgb(1, 2, 3)` and the modern space syntax with a
 * slash-separated alpha `rgb(1 2 3 / 50%)`, since both are current CSS and both get pasted.
 */
export function parseColor(input: string): Rgb | null {
  const text = input.trim()
  if (!text) return null
  if (text.startsWith('#')) return parseHex(text)

  const match = text.match(/^([a-z]+)\(([^)]*)\)$/i)
  if (!match) return null
  const name = match[1].toLowerCase()
  const [mainPart, alphaPart] = match[2].split('/')
  const tokens = mainPart.trim().split(/[\s,]+/).filter(Boolean)
  if (tokens.length < 3) return null
  if (tokens.slice(0, 3).some((token) => !Number.isFinite(parseFloat(token)))) return null

  const alphaToken = alphaPart?.trim() ?? tokens[3]
  const alpha =
    alphaToken === undefined
      ? 1
      : clamp(alphaToken.endsWith('%') ? parseFloat(alphaToken) / 100 : parseFloat(alphaToken), 0, 1)
  if (!Number.isFinite(alpha)) return null

  /** A ratio written either as `50%` or as the bare `0.5`. */
  const ratio = (i: number) => {
    const token = tokens[i]
    const value = parseFloat(token)
    return token.endsWith('%') ? value / 100 : value > 1 ? value / 100 : value
  }

  if (name === 'rgb' || name === 'rgba') {
    const channel = (i: number) =>
      tokens[i].endsWith('%') ? (parseFloat(tokens[i]) / 100) * 255 : parseFloat(tokens[i])
    return {
      r: clamp(Math.round(channel(0)), 0, 255),
      g: clamp(Math.round(channel(1)), 0, 255),
      b: clamp(Math.round(channel(2)), 0, 255),
      a: alpha,
    }
  }
  if (name === 'hsl' || name === 'hsla') {
    return hslToRgb(parseFloat(tokens[0]), ratio(1), ratio(2), alpha)
  }
  if (name === 'oklch') {
    // Chroma is an absolute 0–0.4-ish number, so a percentage there is relative to 0.4.
    const lightness = ratio(0)
    const chroma = tokens[1].endsWith('%') ? (parseFloat(tokens[1]) / 100) * 0.4 : parseFloat(tokens[1])
    return oklchToRgb(lightness, chroma, parseFloat(tokens[2]), alpha)
  }
  return null
}

// --- HSL ---

export function rgbToHsl({ r, g, b }: Rgb): { h: number; s: number; l: number } {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const delta = max - min
  const l = (max + min) / 2

  if (delta === 0) return { h: 0, s: 0, l }
  const s = delta / (1 - Math.abs(2 * l - 1))
  let h: number
  if (max === rn) h = ((gn - bn) / delta) % 6
  else if (max === gn) h = (bn - rn) / delta + 2
  else h = (rn - gn) / delta + 4
  h *= 60
  if (h < 0) h += 360
  return { h, s, l }
}

export function hslToRgb(h: number, s: number, l: number, a = 1): Rgb {
  const hue = ((h % 360) + 360) % 360
  const sat = clamp(s, 0, 1)
  const light = clamp(l, 0, 1)
  const c = (1 - Math.abs(2 * light - 1)) * sat
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = light - c / 2
  const [r1, g1, b1] =
    hue < 60 ? [c, x, 0]
    : hue < 120 ? [x, c, 0]
    : hue < 180 ? [0, c, x]
    : hue < 240 ? [0, x, c]
    : hue < 300 ? [x, 0, c]
    : [c, 0, x]
  return {
    r: clamp(Math.round((r1 + m) * 255), 0, 255),
    g: clamp(Math.round((g1 + m) * 255), 0, 255),
    b: clamp(Math.round((b1 + m) * 255), 0, 255),
    a,
  }
}

// --- OKLab / OKLCH (Björn Ottosson's matrices) ---

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const toGamma = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055)

export function rgbToOklch({ r, g, b }: Rgb): { l: number; c: number; h: number } {
  const lr = toLinear(r / 255)
  const lg = toLinear(g / 255)
  const lb = toLinear(b / 255)

  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)

  const okL = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const okA = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const okB = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s

  const chroma = Math.sqrt(okA * okA + okB * okB)
  let hue = (Math.atan2(okB, okA) * 180) / Math.PI
  if (hue < 0) hue += 360
  return { l: okL, c: chroma, h: chroma < 1e-6 ? 0 : hue }
}

export function oklchToRgb(okL: number, chroma: number, hue: number, a = 1): Rgb {
  const rad = (hue * Math.PI) / 180
  const okA = chroma * Math.cos(rad)
  const okB = chroma * Math.sin(rad)

  const l = (okL + 0.3963377774 * okA + 0.2158037573 * okB) ** 3
  const m = (okL - 0.1055613458 * okA - 0.0638541728 * okB) ** 3
  const s = (okL - 0.0894841775 * okA - 1.291485548 * okB) ** 3

  const lr = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s

  return {
    r: clamp(Math.round(toGamma(lr) * 255), 0, 255),
    g: clamp(Math.round(toGamma(lg) * 255), 0, 255),
    b: clamp(Math.round(toGamma(lb) * 255), 0, 255),
    a,
  }
}

// --- formatting ---

export function toHex({ r, g, b, a }: Rgb): string {
  const pair = (n: number) => n.toString(16).padStart(2, '0')
  const base = `#${pair(r)}${pair(g)}${pair(b)}`
  return a < 1 ? base + pair(Math.round(a * 255)) : base
}

export function formatRgb({ r, g, b, a }: Rgb): string {
  return a < 1 ? `rgb(${r} ${g} ${b} / ${round(a, 3)})` : `rgb(${r} ${g} ${b})`
}

export function formatHsl(rgb: Rgb): string {
  const { h, s, l } = rgbToHsl(rgb)
  const body = `${round(h, 1)} ${round(s * 100, 1)}% ${round(l * 100, 1)}%`
  return rgb.a < 1 ? `hsl(${body} / ${round(rgb.a, 3)})` : `hsl(${body})`
}

export function formatOklch(rgb: Rgb): string {
  const { l, c, h } = rgbToOklch(rgb)
  const body = `${round(l * 100, 2)}% ${round(c, 4)} ${round(h, 2)}`
  return rgb.a < 1 ? `oklch(${body} / ${round(rgb.a, 3)})` : `oklch(${body})`
}

// --- contrast ---

/** WCAG 2.x relative luminance. */
export function luminance({ r, g, b }: Rgb): number {
  return 0.2126 * toLinear(r / 255) + 0.7152 * toLinear(g / 255) + 0.0722 * toLinear(b / 255)
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = luminance(a)
  const lb = luminance(b)
  const [light, dark] = la > lb ? [la, lb] : [lb, la]
  return (light + 0.05) / (dark + 0.05)
}

/** WCAG 2.1: 4.5 for normal text, 3 for large text; AAA raises both. */
export function wcagLevel(ratio: number, large = false): 'AAA' | 'AA' | 'fail' {
  if (ratio >= (large ? 4.5 : 7)) return 'AAA'
  if (ratio >= (large ? 3 : 4.5)) return 'AA'
  return 'fail'
}

export const WHITE: Rgb = { r: 255, g: 255, b: 255, a: 1 }
export const BLACK: Rgb = { r: 0, g: 0, b: 0, a: 1 }
