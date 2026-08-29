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

export interface AvatarConfig {
  skinId: string
  hairColorId: string
  clothColorId: string
  bgColorId: string
  background: boolean
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
    background: true,
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

  // matches Avatar/Circle.svg: circle r=120 inside a translate(12, 40) group
  const bg = config.background ? `<circle cx="132" cy="160" r="120" fill="${bgColor.hex}"/>` : ''

  return (
    `<svg width="264" height="280" viewBox="0 0 264 280" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">` +
    bg +
    `<defs>${BODY_DEFS_SVG}</defs>` +
    bodyGroup +
    `<g transform="translate(0, 170)">${clothesSvg}</g>` +
    `<g transform="translate(76, 82)">` +
    `<g transform="translate(2, 52)" fill-opacity="0.7">${mouth.svg}</g>` +
    `<g transform="translate(28, 40)" fill-opacity="0.16">${nose.svg}</g>` +
    `<g transform="translate(0, 8)" fill-opacity="0.6">${eyes.svg}</g>` +
    `<g fill-opacity="0.6">${eyebrow.svg}</g>` +
    `</g>` +
    `<g transform="translate(-1, 0)">${topSvg}</g>` +
    `<g transform="translate(48, 72)">${facialHairSvg}</g>` +
    `<g transform="translate(61, 85)">${accessory.svg}</g>` +
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
