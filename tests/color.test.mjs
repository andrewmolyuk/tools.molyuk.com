import { done, eq, near } from './harness.mjs'
import {
  parseColor, rgbToHsl, hslToRgb, rgbToOklch, oklchToRgb,
  toHex, formatRgb, formatHsl, formatOklch, contrastRatio, wcagLevel, WHITE, BLACK,
} from '../src/tools/color/color.ts'


console.log('--- parsing ---')
eq('#fff', JSON.stringify(parseColor('#fff')), '{"r":255,"g":255,"b":255,"a":1}')
eq('#ff0000', JSON.stringify(parseColor('#ff0000')), '{"r":255,"g":0,"b":0,"a":1}')
eq('#00ff0080 alpha', JSON.stringify(parseColor('#00ff0080')), '{"r":0,"g":255,"b":0,"a":0.5019607843137255}')
eq('#f00a short alpha', JSON.stringify(parseColor('#f00a')), '{"r":255,"g":0,"b":0,"a":0.6666666666666666}')
eq('rgb legacy commas', JSON.stringify(parseColor('rgb(18, 52, 86)')), '{"r":18,"g":52,"b":86,"a":1}')
eq('rgb modern spaces', JSON.stringify(parseColor('rgb(18 52 86)')), '{"r":18,"g":52,"b":86,"a":1}')
eq('rgba slash alpha', JSON.stringify(parseColor('rgb(18 52 86 / 50%)')), '{"r":18,"g":52,"b":86,"a":0.5}')
eq('rgba 4th arg', JSON.stringify(parseColor('rgba(18,52,86,0.25)')), '{"r":18,"g":52,"b":86,"a":0.25}')
eq('garbage', parseColor('not a color'), null)
eq('bad hex length', parseColor('#12345'), null)
eq('non-hex chars', parseColor('#gggggg'), null)
eq('empty', parseColor('   '), null)

console.log('\n--- HSL known values ---')
eq('red -> hsl', formatHsl(parseColor('#ff0000')), 'hsl(0 100% 50%)')
eq('lime -> hsl', formatHsl(parseColor('#00ff00')), 'hsl(120 100% 50%)')
eq('blue -> hsl', formatHsl(parseColor('#0000ff')), 'hsl(240 100% 50%)')
eq('white -> hsl', formatHsl(parseColor('#ffffff')), 'hsl(0 0% 100%)')
eq('gray -> hsl', formatHsl(parseColor('#808080')), 'hsl(0 0% 50.2%)')
eq('hsl parse round trip', toHex(parseColor('hsl(120 100% 50%)')), '#00ff00')
eq('hsl legacy commas', toHex(parseColor('hsl(240, 100%, 50%)')), '#0000ff')

console.log('\n--- OKLCH against Ottosson reference values ---')
// White is L=1, C=0. Reference: oklch(100% 0 0)
const w = rgbToOklch(WHITE)
near('white L', w.l, 1.0, 0.001); near('white C', w.c, 0, 0.001)
const k = rgbToOklch(BLACK)
near('black L', k.l, 0, 0.001)
// sRGB red = oklch(62.796% 0.25768 29.234) per the CSS Color 4 spec examples
const r = rgbToOklch(parseColor('#ff0000'))
near('red L', r.l, 0.62796, 0.0005); near('red C', r.c, 0.25768, 0.0005); near('red H', r.h, 29.234, 0.05)
const g = rgbToOklch(parseColor('#00ff00'))
near('green L', g.l, 0.86644, 0.0005); near('green C', g.c, 0.29483, 0.0005); near('green H', g.h, 142.495, 0.05)
const b = rgbToOklch(parseColor('#0000ff'))
near('blue L', b.l, 0.45201, 0.0005); near('blue C', b.c, 0.31321, 0.0005); near('blue H', b.h, 264.052, 0.05)

console.log('\n--- round trips over the whole cube ---')
let hslBad = 0, oklchBad = 0, worstOklch = 0
for (let i = 0; i < 30000; i++) {
  const c = { r: Math.floor(Math.random()*256), g: Math.floor(Math.random()*256), b: Math.floor(Math.random()*256), a: 1 }
  const h = rgbToHsl(c); const backH = hslToRgb(h.h, h.s, h.l)
  if (backH.r !== c.r || backH.g !== c.g || backH.b !== c.b) hslBad++
  const o = rgbToOklch(c); const backO = oklchToRgb(o.l, o.c, o.h)
  const d = Math.max(Math.abs(backO.r-c.r), Math.abs(backO.g-c.g), Math.abs(backO.b-c.b))
  worstOklch = Math.max(worstOklch, d)
  if (d > 1) oklchBad++
}
eq('30000 RGB->HSL->RGB exact', hslBad, 0)
eq('30000 RGB->OKLCH->RGB within 1/255', oklchBad, 0)
console.log(`  worst OKLCH round-trip drift: ${worstOklch} of 255`)

console.log('\n--- WCAG contrast against published values ---')
near('black on white = 21', contrastRatio(BLACK, WHITE), 21, 0.01)
near('white on white = 1', contrastRatio(WHITE, WHITE), 1, 0.001)
// #767676 on white is the canonical "exactly passes AA" grey (4.54)
near('#767676 on white', contrastRatio(parseColor('#767676'), WHITE), 4.54, 0.01)
eq('#767676 AA', wcagLevel(contrastRatio(parseColor('#767676'), WHITE)), 'AA')
eq('#595959 AAA', wcagLevel(contrastRatio(parseColor('#595959'), WHITE)), 'AAA')
eq('#999999 fails', wcagLevel(contrastRatio(parseColor('#999999'), WHITE)), 'fail')
// #999999 is 2.85 — below the 3.0 large-text floor too, so it fails both.
eq('#999999 fails large text as well', wcagLevel(contrastRatio(parseColor('#999999'), WHITE), true), 'fail')
// #8c8c8c is 3.36: passes the large-text floor, misses the 4.5 normal-text one.
eq('#8c8c8c fails normal text', wcagLevel(contrastRatio(parseColor('#8c8c8c'), WHITE)), 'fail')
eq('#8c8c8c passes AA for large text', wcagLevel(contrastRatio(parseColor('#8c8c8c'), WHITE), true), 'AA')
eq('symmetric', contrastRatio(BLACK, WHITE) === contrastRatio(WHITE, BLACK), true)

console.log('\n--- formatting ---')
eq('hex keeps alpha', toHex({r:255,g:0,b:0,a:0.5}), '#ff000080')
eq('hex drops opaque alpha', toHex({r:255,g:0,b:0,a:1}), '#ff0000')
eq('rgb with alpha', formatRgb({r:1,g:2,b:3,a:0.5}), 'rgb(1 2 3 / 0.5)')
eq('oklch format shape', /^oklch\(\d+(\.\d+)?% [\d.]+ [\d.]+\)$/.test(formatOklch(parseColor('#3366cc'))), true)

done()
