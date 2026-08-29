import {
  SKIN_TONES,
  HAIR_COLORS,
  PALETTE_COLORS,
  EYES,
  MOUTHS,
  NOSES,
  EYEBROWS,
  ACCESSORIES,
  FACIAL_HAIR,
  CLOTHES,
  TOPS,
  BODY_DEFS_SVG,
  BODY_GROUP_SVG,
  BODY_SKIN_PLACEHOLDER,
} from './parts.generated'

export type BackgroundStyle = 'full' | 'circle' | 'transparent'

export interface AvatarConfig {
  skinId: string
  hairColorId: string
  clothColorId: string
  bgColorId: string
  backgroundStyle: BackgroundStyle
  topId: string
  eyesId: string
  eyebrowId: string
  mouthId: string
  noseId: string
  facialHairId: string
  accessoryId: string
  clothesId: string
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function byId<T extends { id: string }>(arr: T[], id: string): T {
  return arr.find((x) => x.id === id) ?? arr[0]
}

export function randomAvatarConfig(): AvatarConfig {
  return {
    skinId: pick(SKIN_TONES).id,
    hairColorId: pick(HAIR_COLORS).id,
    clothColorId: pick(PALETTE_COLORS).id,
    bgColorId: pick(PALETTE_COLORS).id,
    backgroundStyle: 'circle',
    topId: pick(TOPS).id,
    eyesId: pick(EYES).id,
    eyebrowId: pick(EYEBROWS).id,
    mouthId: pick(MOUTHS).id,
    noseId: NOSES[0].id,
    facialHairId: pick(FACIAL_HAIR).id,
    accessoryId: pick(ACCESSORIES).id,
    clothesId: pick(CLOTHES).id,
  }
}

function recolor(svg: string, placeholderHex: string | null, hex: string): string {
  if (!placeholderHex) return svg
  return svg.split(placeholderHex).join(hex)
}

/**
 * Flatten the eyebrow to an opaque colour: 60% black pre-blended over the skin.
 *
 * The source draws every eyebrow as black at 60% opacity. Over the cheek that
 * gives the intended soft brown, but the tall eyes (Surprised, Wink Wacky)
 * reach up under the brow, and there the white of the eye bleeds through as a
 * grey patch. Pre-blending against the skin keeps exactly the colour the
 * designer intended while making the brow opaque, so it reads the same
 * wherever it lands. (The reference implementation has this artefact too.)
 */
function flattenEyebrow(svg: string, skinHex: string): string {
  const channel = (i: number) =>
    Math.round(parseInt(skinHex.slice(1 + i * 2, 3 + i * 2), 16) * 0.4)
      .toString(16)
      .padStart(2, '0')
  const hex = `#${channel(0)}${channel(1)}${channel(2)}`
  return svg
    .split('fill-opacity="0.599999964"')
    .join('fill-opacity="1"')
    .split('fill="#000000"')
    .join(`fill="${hex}"`)
}

export function assembleAvatarSvg(config: AvatarConfig): string {
  const skin = byId(SKIN_TONES, config.skinId)
  const hairColor = byId(HAIR_COLORS, config.hairColorId)
  const clothColor = byId(PALETTE_COLORS, config.clothColorId)
  const bgColor = byId(PALETTE_COLORS, config.bgColorId)

  const top = byId(TOPS, config.topId)
  const eyes = byId(EYES, config.eyesId)
  const eyebrow = byId(EYEBROWS, config.eyebrowId)
  const mouth = byId(MOUTHS, config.mouthId)
  const nose = byId(NOSES, config.noseId)
  const facialHair = byId(FACIAL_HAIR, config.facialHairId)
  const accessory = byId(ACCESSORIES, config.accessoryId)
  const clothes = byId(CLOTHES, config.clothesId)

  const bodyGroup = recolor(BODY_GROUP_SVG, BODY_SKIN_PLACEHOLDER, skin.hex)
  const clothesSvg = recolor(clothes.svg, clothes.placeholderHex, clothColor.hex)
  const topSvg = recolor(top.svg, top.placeholderHex, hairColor.hex)
  const facialHairSvg = recolor(facialHair.svg, facialHair.placeholderHex, hairColor.hex)
  const eyebrowSvg = flattenEyebrow(eyebrow.svg, skin.hex)

  // matches Avatar/Circle.svg: circle r=120 inside a translate(12, 40) group
  const bg =
    config.backgroundStyle === 'circle'
      ? `<circle cx="132" cy="160" r="120" fill="${bgColor.hex}"/>`
      : config.backgroundStyle === 'full'
        ? `<rect x="0" y="0" width="264" height="280" fill="${bgColor.hex}"/>`
        : ''

  // Circle.svg's own foreground mask: a plain rectangle for the top half
  // (so hair/hats can overflow above the circle, as in the reference) that
  // tapers into the circle's curve for the bottom half (so shoulders/
  // clothing — wider than the circle — get cropped to it cleanly).
  const clipOpen = config.backgroundStyle === 'circle' ? '<g clip-path="url(#avatar-clip)">' : ''
  const clipClose = config.backgroundStyle === 'circle' ? '</g>' : ''
  const clipDef =
    config.backgroundStyle === 'circle'
      ? '<clipPath id="avatar-clip"><path d="M264,0 L264,160 L252,159.999 C252,225.611428 199.343314,278.924229 133.984419,279.983923 L132,280 C65.72583,280 12,226.27417 12,160 L0,160 L0,0 L264,0 Z"/></clipPath>'
      : ''

  return (
    `<svg width="264" height="280" viewBox="0 0 264 280" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">` +
    bg +
    `<defs>${clipDef}${BODY_DEFS_SVG}</defs>` +
    clipOpen +
    bodyGroup +
    `<g transform="translate(0, 170)">${clothesSvg}</g>` +
    // No fill-opacity on these wrappers: each source part already bakes the
    // designer's intended opacity onto the exact elements that need it (the
    // dark mouth shape, the pupils, the brow strokes) and deliberately leaves
    // the rest opaque (white teeth, eye whites, pink tongue). A blanket
    // fill-opacity here is inherited by those too, so overlapping parts show
    // through each other.
    `<g transform="translate(76, 82)">` +
    `<g transform="translate(2, 52)">${mouth.svg}</g>` +
    `<g transform="translate(28, 40)">${nose.svg}</g>` +
    `<g transform="translate(0, 8)">${eyes.svg}</g>` +
    `<g>${eyebrowSvg}</g>` +
    `</g>` +
    `<g transform="translate(-1, 0)">${topSvg}</g>` +
    `<g transform="translate(48, 72)">${facialHairSvg}</g>` +
    `<g transform="translate(61, 85)">${accessory.svg}</g>` +
    clipClose +
    `</svg>`
  )
}

export {
  SKIN_TONES,
  HAIR_COLORS,
  PALETTE_COLORS,
  EYES,
  MOUTHS,
  EYEBROWS,
  ACCESSORIES,
  FACIAL_HAIR,
  CLOTHES,
  TOPS,
}
