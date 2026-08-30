/**
 * User-Agent parsing by ordered rules.
 *
 * Order is the whole design. Every Chromium browser claims "Chrome", every WebKit
 * browser claims "Safari", and almost everything still claims "Mozilla/5.0" — so the
 * specific brands have to be tested before the generic ones they impersonate. Edge must
 * beat Chrome, Chrome must beat Safari, and Safari is only Safari once nothing else has
 * matched.
 */

export interface UaRule {
  name: string
  pattern: RegExp
}

const BROWSERS: UaRule[] = [
  { name: 'Edge', pattern: /Edg(?:e|A|iOS)?\/([\d.]+)/ },
  { name: 'Opera', pattern: /(?:OPR|Opera)\/([\d.]+)/ },
  { name: 'Vivaldi', pattern: /Vivaldi\/([\d.]+)/ },
  { name: 'Brave', pattern: /Brave\/([\d.]+)/ },
  { name: 'Yandex Browser', pattern: /YaBrowser\/([\d.]+)/ },
  { name: 'Samsung Internet', pattern: /SamsungBrowser\/([\d.]+)/ },
  { name: 'UC Browser', pattern: /UCBrowser\/([\d.]+)/ },
  { name: 'Firefox', pattern: /(?:Firefox|FxiOS)\/([\d.]+)/ },
  { name: 'Chrome', pattern: /(?:Chrome|CriOS)\/([\d.]+)/ },
  { name: 'Safari', pattern: /Version\/([\d.]+).*Safari/ },
  { name: 'Internet Explorer', pattern: /(?:MSIE |rv:)([\d.]+)\)?.*Trident/ },
]

const ENGINES: UaRule[] = [
  { name: 'Blink', pattern: /Chrome\/([\d.]+)/ },
  { name: 'Gecko', pattern: /rv:([\d.]+).*Gecko\/\d/ },
  { name: 'WebKit', pattern: /AppleWebKit\/([\d.]+)/ },
  { name: 'Trident', pattern: /Trident\/([\d.]+)/ },
]

const OSES: UaRule[] = [
  { name: 'Windows', pattern: /Windows NT ([\d.]+)/ },
  { name: 'Android', pattern: /Android ([\d.]+)/ },
  { name: 'iOS', pattern: /(?:iPhone )?OS ([\d_]+) like Mac OS X/ },
  { name: 'macOS', pattern: /Mac OS X ([\d_.]+)/ },
  { name: 'Chrome OS', pattern: /CrOS \w+ ([\d.]+)/ },
  { name: 'Ubuntu', pattern: /Ubuntu/ },
  { name: 'Linux', pattern: /Linux/ },
]

/** Windows reports a kernel version; users think in product names. */
const WINDOWS_NAMES: Record<string, string> = {
  '10.0': '10 / 11',
  '6.3': '8.1',
  '6.2': '8',
  '6.1': '7',
  '6.0': 'Vista',
  '5.1': 'XP',
}

const BOTS: UaRule[] = [
  { name: 'Googlebot', pattern: /Googlebot\/?([\d.]*)/ },
  { name: 'Bingbot', pattern: /bingbot\/([\d.]+)/ },
  { name: 'DuckDuckBot', pattern: /DuckDuckBot\/([\d.]+)/ },
  { name: 'Yandex Bot', pattern: /YandexBot\/([\d.]+)/ },
  { name: 'Baiduspider', pattern: /Baiduspider\/([\d.]+)/ },
  { name: 'Applebot', pattern: /Applebot\/([\d.]+)/ },
  { name: 'Slackbot', pattern: /Slackbot[^/]*\/?([\d.]*)/ },
  { name: 'Discordbot', pattern: /Discordbot\/([\d.]+)/ },
  { name: 'Twitterbot', pattern: /Twitterbot\/([\d.]+)/ },
  { name: 'facebookexternalhit', pattern: /facebookexternalhit\/([\d.]+)/ },
  { name: 'curl', pattern: /curl\/([\d.]+)/ },
  { name: 'wget', pattern: /Wget\/([\d.]+)/ },
  { name: 'Python requests', pattern: /python-requests\/([\d.]+)/ },
  { name: 'Go http', pattern: /Go-http-client\/([\d.]+)/ },
  { name: 'Postman', pattern: /PostmanRuntime\/([\d.]+)/ },
]

export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'tv' | 'bot'

export interface UaResult {
  browser: { name: string; version: string } | null
  engine: { name: string; version: string } | null
  os: { name: string; version: string } | null
  device: DeviceType
  bot: { name: string; version: string } | null
}

function match(rules: UaRule[], ua: string): { name: string; version: string } | null {
  for (const rule of rules) {
    const found = rule.pattern.exec(ua)
    if (found) return { name: rule.name, version: (found[1] ?? '').replace(/_/g, '.') }
  }
  return null
}

function deviceOf(ua: string, isBot: boolean): DeviceType {
  if (isBot) return 'bot'
  // Sets spell this a dozen ways: SMART-TV, SmartTV, BRAVIA, Web0S (with a zero), CrKey
  // for Chromecast. Tizen and webOS only mean a TV alongside one of those markers.
  if (/\b(smart-?tv|googletv|apple ?tv|hbbtv|netcast|netcasttv|bravia|roku|crkey|web0s|webos)\b/i.test(ua)) {
    return 'tv'
  }
  // An iPad on desktop-mode Safari reports as a Mac, so Macintosh with touch is a tablet.
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && /Mobile\//.test(ua))) return 'tablet'
  if (/Android/.test(ua) && !/Mobile/.test(ua)) return 'tablet'
  if (/Mobi|iPhone|iPod|Windows Phone|IEMobile/i.test(ua)) return 'mobile'
  return 'desktop'
}

export function parseUserAgent(ua: string): UaResult {
  const text = ua.trim()
  const bot = match(BOTS, text)

  const os = match(OSES, text)
  if (os && os.name === 'Windows') {
    os.version = WINDOWS_NAMES[os.version] ?? os.version
  }

  return {
    browser: bot ? null : match(BROWSERS, text),
    engine: bot ? null : match(ENGINES, text),
    os,
    device: deviceOf(text, Boolean(bot)),
    bot,
  }
}

export const SAMPLES: { label: string; value: string }[] = [
  {
    label: 'Chrome / Windows',
    value:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
  },
  {
    label: 'Safari / iPhone',
    value:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Mobile/15E148 Safari/604.1',
  },
  {
    label: 'Firefox / macOS',
    value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:135.0) Gecko/20100101 Firefox/135.0',
  },
  {
    label: 'Googlebot',
    value:
      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
  },
]
