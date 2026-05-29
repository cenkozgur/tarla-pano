// Tarla Panosu veri toplayıcı.
// Çıktı: public/data/market.json  (PWA bunu okur)
//
//  - Döviz + altın : truncgil v4 (canlı, ücretsiz)
//  - Haber         : tarimdanhaber RSS (canlı)
//  - Ürün fiyatları: scraper/commodities-manual.json (elle güncellenir — borsa API'si yok)
//
// Çalıştır:  npm run scrape

import { writeFile, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'public', 'data', 'market.json')
const MANUAL = join(__dirname, 'commodities-manual.json')

const NEWS_RSS = 'https://www.tarimdanhaber.com/rss'
const TRUNCGIL = 'https://finans.truncgil.com/v4/today.json'

// truncgil anahtarı -> bizim gösterim
const FX_MAP = [
  ['USD', 'Dolar'],
  ['EUR', 'Euro'],
  ['GRA', 'Gram Altın'],
  ['CEYREKALTIN', 'Çeyrek Altın'],
  ['CUMHURIYETALTINI', 'Cumhuriyet Altını'],
]

async function getFx() {
  const r = await fetch(TRUNCGIL)
  if (!r.ok) throw new Error(`truncgil ${r.status}`)
  const d = await r.json()
  return FX_MAP.map(([code, name]) => {
    const x = d[code]
    if (!x) return null
    return {
      code,
      name,
      buy: round2(x.Buying),
      sell: round2(x.Selling),
      change: round2(x.Change ?? 0),
    }
  }).filter(Boolean)
}

async function getNews(limit = 8) {
  const r = await fetch(NEWS_RSS, { headers: { 'User-Agent': 'Mozilla/5.0 TarlaPano' } })
  if (!r.ok) throw new Error(`rss ${r.status}`)
  const xml = await r.text()
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, limit)
  return items.map((m) => {
    const it = m[1]
    const g = (tag) => {
      const mm = it.match(new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`))
      return mm ? mm[1].trim() : ''
    }
    const pub = g('pubDate')
    return {
      title: decode(g('title')),
      url: g('link'),
      source: 'Tarımdan Haber',
      date: pub ? new Date(pub).toISOString().slice(0, 10) : '',
    }
  })
}

async function getManual() {
  const raw = JSON.parse(await readFile(MANUAL, 'utf8'))
  return { commodities: raw.commodities, inputs: raw.inputs, manualDate: raw.updatedAt }
}

function round2(n) {
  const v = typeof n === 'string' ? parseFloat(n.replace(',', '.')) : n
  return Math.round(v * 100) / 100
}

function decode(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, '’')
}

async function main() {
  const out = { updatedAt: new Date().toISOString() }
  const errors = []

  const results = await Promise.allSettled([getFx(), getNews(), getManual()])
  const [fx, news, man] = results

  if (fx.status === 'fulfilled') out.fx = fx.value
  else errors.push(`fx: ${fx.reason.message}`)

  if (news.status === 'fulfilled') out.news = news.value
  else errors.push(`news: ${news.reason.message}`)

  if (man.status === 'fulfilled') {
    out.commodities = man.value.commodities
    out.inputs = man.value.inputs
    out.note = `Ürün/girdi fiyatları manuel (${man.value.manualDate}); döviz/altın ve haberler canlı.`
  } else {
    errors.push(`manual: ${man.reason.message}`)
  }

  if (errors.length) out.errors = errors

  await writeFile(OUT, JSON.stringify(out, null, 2) + '\n')
  console.log(`✓ market.json yazıldı — fx:${out.fx?.length ?? 0} haber:${out.news?.length ?? 0} ürün:${out.commodities?.length ?? 0} girdi:${out.inputs?.length ?? 0}`)
  if (errors.length) console.warn('⚠️ hatalar:', errors.join(' | '))
}

main().catch((e) => {
  console.error('✗ scrape başarısız:', e)
  process.exit(1)
})
