import { parseUserAgent, SAMPLES } from '../src/tools/user-agent/ua.ts'
import { done, eq } from './harness.mjs'
const sum = (ua) => { const p = parseUserAgent(ua); return `${p.bot?'bot='+p.bot.name+' ':''}${p.browser?p.browser.name+' '+p.browser.version:'-'}|${p.engine?p.engine.name:'-'}|${p.os?p.os.name+' '+p.os.version:'-'}|${p.device}` }

console.log('--- the impersonation chain: specific must beat generic ---')
// Every one of these also contains "Chrome" and/or "Safari" and "Mozilla/5.0".
eq('Edge beats Chrome+Safari',
  sum('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0'),
  'Edge 141.0.0.0|Blink|Windows 10 / 11|desktop')
eq('Opera beats Chrome',
  sum('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 OPR/117.0.0.0'),
  'Opera 117.0.0.0|Blink|Windows 10 / 11|desktop')
eq('Yandex beats Chrome',
  sum('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 YaBrowser/25.1.0 Safari/537.36'),
  'Yandex Browser 25.1.0|Blink|Windows 10 / 11|desktop')
eq('Samsung beats Chrome',
  sum('Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36'),
  'Samsung Internet 23.0|Blink|Android 14|mobile')
eq('Chrome beats Safari',
  sum('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'),
  'Chrome 141.0.0.0|Blink|Windows 10 / 11|desktop')
eq('Safari only when nothing else matched',
  sum('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15'),
  'Safari 18.2|WebKit|macOS 10.15.7|desktop')
eq('Firefox not Gecko-confused',
  sum('Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:135.0) Gecko/20100101 Firefox/135.0'),
  'Firefox 135.0|Gecko|macOS 10.15|desktop')
// iOS browsers are all WebKit and all lie about being Safari.
eq('Chrome on iOS is CriOS',
  sum('Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0.0.0 Mobile/15E148 Safari/604.1'),
  'Chrome 141.0.0.0|WebKit|iOS 18.2|mobile')
eq('Firefox on iOS is FxiOS',
  sum('Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/135.0 Mobile/15E148 Safari/605.1.15'),
  'Firefox 135.0|WebKit|iOS 18.2|mobile')

console.log('\n--- Windows kernel versions become product names ---')
for (const [nt, want] of [['10.0','10 / 11'],['6.3','8.1'],['6.1','7'],['5.1','XP']]) {
  eq(`NT ${nt}`, parseUserAgent(`Mozilla/5.0 (Windows NT ${nt}) Gecko/20100101 Firefox/1.0`).os.version, want)
}

console.log('\n--- device classification ---')
eq('iPad is a tablet', parseUserAgent('Mozilla/5.0 (iPad; CPU OS 18_2 like Mac OS X) AppleWebKit/605.1.15 Version/18.2 Mobile/15E148 Safari/604.1').device, 'tablet')
eq('Android without Mobile is a tablet', parseUserAgent('Mozilla/5.0 (Linux; Android 14; SM-X200) AppleWebKit/537.36 Chrome/141.0.0.0 Safari/537.36').device, 'tablet')
eq('Android with Mobile is a phone', parseUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 9) AppleWebKit/537.36 Chrome/141.0.0.0 Mobile Safari/537.36').device, 'mobile')
eq('plain desktop', parseUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/141.0.0.0 Safari/537.36').device, 'desktop')
eq('smart TV', parseUserAgent('Mozilla/5.0 (SMART-TV; Linux; Tizen 6.0) AppleWebKit/537.36 Chrome/76.0 Safari/537.36').device, 'tv')

console.log('\n--- bots are bots, not browsers ---')
const bot = parseUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36')
eq('Googlebot detected', bot.bot.name, 'Googlebot')
eq('bot reports no browser despite claiming Chrome', bot.browser, null)
eq('bot device type', bot.device, 'bot')
eq('curl', parseUserAgent('curl/8.7.1').bot.name, 'curl')
eq('curl has no browser', parseUserAgent('curl/8.7.1').browser, null)
eq('Python requests', parseUserAgent('python-requests/2.32.3').bot.name, 'Python requests')

console.log('\n--- degrades gracefully ---')
eq('empty string', JSON.stringify(parseUserAgent('')), '{"browser":null,"engine":null,"os":null,"device":"desktop","bot":null}')
eq('garbage does not throw', parseUserAgent('!!! nonsense !!!').device, 'desktop')
eq('all built-in samples parse', SAMPLES.every(s => { const p = parseUserAgent(s.value); return Boolean(p.browser || p.bot) }), true)

done()
