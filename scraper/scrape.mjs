// Tarla Panosu veri toplayıcı.  Çıktı: public/data/market.json  (PWA bunu okur)
//
//  - Döviz + altın : truncgil v4                       (canlı)
//  - Haber         : tarimdanhaber RSS                 (canlı)
//  - Ürün fiyatları: TOBB ticaret borsası portalı      (canlı; çekilemezse manuel fallback)
//  - Mazot         : hasanadiguzel akaryakıt API       (canlı; çekilemezse manuel fallback)
//  - Gübre/kanola  : scraper/commodities-manual.json   (elle)
//
// Çalıştır:  npm run scrape

import { writeFile, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'public', 'data', 'market.json')
const MANUAL = join(__dirname, 'commodities-manual.json')

const TRUNCGIL = 'https://finans.truncgil.com/v4/today.json'
const NEWS_RSS = 'https://www.tarimdanhaber.com/rss'
const UA = 'Mozilla/5.0 TarlaPano'

const FX_MAP = [
  ['USD', 'Dolar'],
  ['EUR', 'Euro'],
  ['GRA', 'Gram Altın'],
  ['CEYREKALTIN', 'Çeyrek Altın'],
  ['CUMHURIYETALTINI', 'Cumhuriyet Altını'],
]

// TOBB borsa tablosundan çekilecek ürünler (ad eşleşmesi + yedek geniş eşleşme)
const BORSA_TARGETS = [
  { key: 'bugday', name: 'Buğday (ekmeklik)', match: /BUĞDAY EKMEKLİK.*1\.DERECE/i, alt: /BUĞDAY/i },
  { key: 'arpa', name: 'Arpa', match: /ARPA/i },
  { key: 'aycicegi', name: 'Ayçiçeği (yağlık)', match: /AYÇİÇEĞİ YAĞLIK/i, alt: /AYÇİÇEĞİ/i },
]

// ---- sayı / metin yardımcıları ------------------------------------------
const trNum = (s) => {
  if (typeof s === 'number') return s
  const v = parseFloat(String(s).replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(v) ? Math.round(v * 100) / 100 : null
}
const round2 = (n) => Math.round(n * 100) / 100
const stripTags = (s) => s.replace(/<[^>]*>/g, '').trim()
const decode = (s) =>
  s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&rsquo;/g, '’')

// ---- kaynaklar -----------------------------------------------------------
async function getFx() {
  const r = await fetch(TRUNCGIL)
  if (!r.ok) throw new Error(`truncgil ${r.status}`)
  const d = await r.json()
  return FX_MAP.map(([code, name]) => {
    const x = d[code]
    return x ? { code, name, buy: round2(x.Buying), sell: round2(x.Selling), change: round2(x.Change ?? 0) } : null
  }).filter(Boolean)
}

async function getNews(limit = 8) {
  const r = await fetch(NEWS_RSS, { headers: { 'User-Agent': UA } })
  if (!r.ok) throw new Error(`rss ${r.status}`)
  const xml = await r.text()
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, limit).map((m) => {
    const it = m[1]
    const g = (t) => {
      const mm = it.match(new RegExp(`<${t}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${t}>`))
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

// TOBB borsa portalından ürün fiyatları (Ortalama sütunu + son işlem tarihi)
async function getBorsa(borsaKod, borsaAdi) {
  const r = await fetch(`https://borsa.tobb.org.tr/fiyat_borsa.php?borsakod=${borsaKod}`, {
    headers: { 'User-Agent': UA },
  })
  if (!r.ok) throw new Error(`tobb ${r.status}`)
  const html = await r.text()
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((m) =>
    [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((t) => decode(stripTags(t[1]))),
  )
  const find = (re) => rows.find((tds) => tds.length >= 6 && re.test(tds[0]))
  const out = {}
  for (const t of BORSA_TARGETS) {
    const row = find(t.match) || (t.alt && find(t.alt))
    if (!row) continue
    const price = trNum(row[5]) // Ortalama (TL)
    if (price == null) continue
    const date = (row[2] || '').slice(0, 10).split('.').reverse().join('-') // dd.mm.yyyy -> yyyy-mm-dd
    out[t.key] = { key: t.key, name: t.name, unit: '₺/kg', price, change: 0, source: borsaAdi, date }
  }
  return out
}

// hasanadiguzel akaryakıt -> motorin (eurodiesel) ortalaması
async function getDiesel(city) {
  const r = await fetch(`https://hasanadiguzel.com.tr/api/akaryakit/sehir=${city}`, {
    headers: { 'User-Agent': UA },
  })
  if (!r.ok) throw new Error(`akaryakit ${r.status}`)
  const d = await r.json()
  const rows = Object.values(d.data || {})
  const vals = rows
    .map((x) => trNum(x['Motorin(Eurodiesel)_TL/lt']))
    .filter((v) => v != null && v > 0)
  if (!vals.length) throw new Error('motorin verisi yok')
  return round2(vals.reduce((a, b) => a + b, 0) / vals.length)
}

async function getManual() {
  return JSON.parse(await readFile(MANUAL, 'utf8'))
}

async function readPrev() {
  try {
    return JSON.parse(await readFile(OUT, 'utf8'))
  } catch {
    return null
  }
}

// önceki fiyata göre % değişim (borsa/girdi truncgil gibi change vermiyor)
function withChange(items, prevList) {
  const prev = new Map((prevList || []).map((p) => [p.key, p.price]))
  return items.map((it) => {
    const p0 = prev.get(it.key)
    const change = p0 && p0 > 0 ? round2(((it.price - p0) / p0) * 100) : (it.change ?? 0)
    return { ...it, change }
  })
}

// ---- main ----------------------------------------------------------------
async function main() {
  const out = { updatedAt: new Date().toISOString() }
  const errors = []
  const prev = await readPrev()
  const manual = await getManual()
  const cfg = manual.config || {}

  const [fx, news, borsa, diesel] = await Promise.allSettled([
    getFx(),
    getNews(),
    getBorsa(cfg.borsaKod || '5ED10', cfg.borsaAdi || 'Edirne TB'),
    getDiesel(cfg.dieselCity || 'ANKARA'),
  ])

  if (fx.status === 'fulfilled') out.fx = fx.value
  else errors.push(`fx: ${fx.reason.message}`)

  if (news.status === 'fulfilled') out.news = news.value
  else errors.push(`news: ${news.reason.message}`)

  // ürünler: borsadan geleni kullan, gelmeyeni manuel fallback
  const borsaData = borsa.status === 'fulfilled' ? borsa.value : {}
  if (borsa.status !== 'fulfilled') errors.push(`borsa: ${borsa.reason.message}`)
  const commodities = manual.commodities.map((m) => borsaData[m.key] || { ...m, source: m.source + ' (fallback)' })

  // girdiler: motorin'i otomatik, gerisi manuel
  const inputs = manual.inputs.map((m) => {
    if (m.key === 'motorin' && diesel.status === 'fulfilled') {
      return { ...m, price: diesel.value, source: `${cfg.dieselCity || 'ANKARA'} ort.` }
    }
    return m
  })
  if (diesel.status !== 'fulfilled') errors.push(`diesel: ${diesel.reason.message}`)

  out.commodities = withChange(commodities, prev?.commodities)
  out.inputs = withChange(inputs, prev?.inputs)
  out.note = `Borsa: TOBB ${cfg.borsaAdi || ''} · mazot: EPDK bayi ort. · gübre/kanola manuel.`
  if (errors.length) out.errors = errors

  await writeFile(OUT, JSON.stringify(out, null, 2) + '\n')
  console.log(
    `✓ market.json — fx:${out.fx?.length ?? 0} haber:${out.news?.length ?? 0} ürün:${out.commodities.length} girdi:${out.inputs.length}`,
  )
  if (errors.length) console.warn('⚠️', errors.join(' | '))
}

main().catch((e) => {
  console.error('✗ scrape başarısız:', e)
  process.exit(1)
})
