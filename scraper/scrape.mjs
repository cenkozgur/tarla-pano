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
const NEWS_SOURCES = [
  { name: 'Tarımdan Haber', url: 'https://www.tarimdanhaber.com/rss' },
  { name: 'Tarım Pusulası', url: 'https://www.tarimpusulasi.com/rss/genel-0' },
]
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
    .replace(/&nbsp;/g, ' ').replace(/&hellip;/g, '…')
    .replace(/&ldquo;/g, '“').replace(/&rdquo;/g, '”')
    .replace(/&ouml;/g, 'ö').replace(/&uuml;/g, 'ü').replace(/&ccedil;/g, 'ç')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 16)))

// HTML makaleyi okunabilir düz metne çevirir (paragraf bölmeleri korunur, reklam/etiket atılır)
const htmlToText = (h) => {
  if (!h) return ''
  const t = decode(
    h.replace(/<\/(p|div|h\d|li|tr|blockquote)>/gi, '\n').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''),
  )
  return t.split('\n').map((s) => s.replace(/[ \t]+/g, ' ').trim()).filter(Boolean).join('\n\n')
}

// ---- kaynaklar -----------------------------------------------------------
// truncgil bazen bozuk JSON döner -> parse patlarsa ihtiyacımız olan
// alanları ham metinden regex ile çıkar (payload'ın gerisindeki hatadan etkilenmez)
function extractFxKey(text, key) {
  const m = text.match(new RegExp(`"${key}"\\s*:\\s*\\{([^}]*)\\}`))
  if (!m) return null
  const field = (f) => {
    const mm = m[1].match(new RegExp(`"${f}"\\s*:\\s*"?([-0-9.,]+)"?`))
    return mm ? trNum(mm[1]) : null
  }
  const buy = field('Buying'), sell = field('Selling')
  if (buy == null && sell == null) return null
  return { Buying: buy, Selling: sell, Change: field('Change') ?? 0 }
}

async function getFx() {
  const r = await fetch(TRUNCGIL, { headers: { 'User-Agent': UA } })
  if (!r.ok) throw new Error(`truncgil ${r.status}`)
  const text = await r.text()
  let d
  try {
    d = JSON.parse(text)
  } catch {
    d = null // bozuk JSON -> regex fallback'e düş
  }
  const rows = FX_MAP.map(([code, name]) => {
    const x = (d && d[code]) || extractFxKey(text, code)
    return x ? { code, name, buy: round2(x.Buying), sell: round2(x.Selling), change: round2(x.Change ?? 0) } : null
  }).filter(Boolean)
  if (!rows.length) throw new Error('fx alanları çıkarılamadı')
  return rows
}

async function getNewsFrom(src, limit) {
  const r = await fetch(src.url, { headers: { 'User-Agent': UA } })
  if (!r.ok) throw new Error(`${src.name} ${r.status}`)
  const xml = await r.text()
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, limit).map((m) => {
    const it = m[1]
    const g = (t) => {
      const mm = it.match(new RegExp(`<${t}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${t}>`))
      return mm ? mm[1].trim() : ''
    }
    const pub = g('pubDate')
    const summary = htmlToText(g('description'))
    const content = htmlToText(g('content:encoded')) || summary
    return {
      title: decode(g('title')),
      url: g('link'),
      source: src.name,
      date: pub ? new Date(pub).toISOString().slice(0, 10) : '',
      ts: pub ? new Date(pub).getTime() : 0,
      summary: summary.slice(0, 300),
      content: content.slice(0, 5000),
    }
  })
}

// Tüm kaynakları çek, tarihe göre harmanla, başlığa göre tekille
async function getNews(total = 12) {
  const results = await Promise.allSettled(NEWS_SOURCES.map((s) => getNewsFrom(s, 8)))
  const all = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
  const seen = new Set()
  const merged = all
    .filter((n) => n.url && n.title && !seen.has(n.title) && seen.add(n.title))
    .sort((a, b) => b.ts - a.ts)
    .slice(0, total)
    .map(({ ts, ...n }) => n) // ts'i çıktıdan at
  if (!merged.length) throw new Error('hiçbir haber kaynağı yanıt vermedi')
  return merged
}

// TOBB borsa portalından ürün fiyatları (Ortalama sütunu + son işlem tarihi)
async function getBorsa(borsaKod, borsaAdi) {
  const r = await fetch(`https://borsa.tobb.org.tr/fiyat_borsa.php?borsakod=${borsaKod}`, {
    headers: { 'User-Agent': UA },
  })
  if (!r.ok) throw new Error(`tobb ${r.status}`)
  const html = await r.text()
  // başlık kolonlarını bul -> kolon sırası borsadan borsaya değişebilir
  const headers = [...html.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map((m) => decode(stripTags(m[1])))
  const colIdx = (re, fallback) => {
    const i = headers.findIndex((h) => re.test(h))
    return i >= 0 ? i : fallback
  }
  const NAME = colIdx(/Ürün/i, 0)
  const AVG = colIdx(/Ortalama/i, 5)
  const DATE = colIdx(/Tarih/i, 2)

  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((m) =>
    [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((t) => decode(stripTags(t[1]))),
  )
  const find = (re) => rows.find((tds) => tds.length > AVG && re.test(tds[NAME] || ''))
  const out = {}
  for (const t of BORSA_TARGETS) {
    const row = find(t.match) || (t.alt && find(t.alt))
    if (!row) continue
    let price = trNum(row[AVG]) // Ortalama (TL)
    if (price == null || price <= 0) continue
    // bazı borsalar TL/ton raporluyor (örn. Eskişehir). Tahıl kg fiyatı >200₺ olmaz -> ton kabul et
    if (price > 200) price = round2(price / 1000)
    const date = (row[DATE] || '').slice(0, 10).split('.').reverse().join('-') // dd.mm.yyyy -> yyyy-mm-dd
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

  const borsalar = cfg.borsalar?.length ? cfg.borsalar : [{ kod: '5ED10', ad: 'Edirne TB' }]
  const cities = cfg.dieselCities?.length ? cfg.dieselCities : ['ANKARA']
  const defaultBorsa = cfg.defaultBorsa || borsalar[0].kod
  const defaultCity = cfg.defaultCity || cities[0]
  const manualByKey = Object.fromEntries(manual.commodities.map((m) => [m.key, m]))

  const [fx, news, borsaResults, dieselResults] = await Promise.allSettled([
    getFx(),
    getNews(),
    Promise.allSettled(borsalar.map((b) => getBorsa(b.kod, b.ad))),
    Promise.allSettled(cities.map((c) => getDiesel(c))),
  ])

  // kaynak patlarsa önceki değeri koru -> alan asla kaybolmaz, app çökmez
  if (fx.status === 'fulfilled') out.fx = fx.value
  else { errors.push(`fx: ${fx.reason.message}`); if (prev?.fx) out.fx = prev.fx }

  if (news.status === 'fulfilled') out.news = news.value
  else { errors.push(`news: ${news.reason.message}`); if (prev?.news) out.news = prev.news }

  // ---- ürünler: her borsa için ayrı liste (kanola her zaman manuel) ----
  const borsaItems = (found) => {
    const items = Object.values(found)
    if (!found.kanola && manualByKey.kanola) items.push({ ...manualByKey.kanola })
    return items
  }
  const byBorsa = {}
  ;(borsaResults.value || []).forEach((res, i) => {
    const b = borsalar[i]
    if (res.status === 'fulfilled') {
      byBorsa[b.kod] = { ad: b.ad, items: withChange(borsaItems(res.value), prev?.commoditiesByBorsa?.[b.kod]?.items) }
    } else {
      errors.push(`borsa ${b.kod}: ${res.reason.message}`)
      if (prev?.commoditiesByBorsa?.[b.kod]) byBorsa[b.kod] = prev.commoditiesByBorsa[b.kod] // eskiyi koru
    }
  })
  out.commoditiesByBorsa = byBorsa
  // varsayılan borsa düz commodities olarak (eski şema / seçim desteklemeyenler için)
  out.commodities = byBorsa[defaultBorsa]?.items || manual.commodities

  // ---- mazot: her şehir için ayrı fiyat ----
  const byCity = {}
  ;(dieselResults.value || []).forEach((res, i) => {
    if (res.status === 'fulfilled') byCity[cities[i]] = res.value
    else { errors.push(`mazot ${cities[i]}: ${res.reason.message}`); if (prev?.dieselByCity?.[cities[i]]) byCity[cities[i]] = prev.dieselByCity[cities[i]] }
  })
  out.dieselByCity = byCity
  // girdiler: motorin varsayılan şehirden, gübreler manuel
  const inputs = manual.inputs.map((m) =>
    m.key === 'motorin' && byCity[defaultCity] != null
      ? { ...m, price: byCity[defaultCity], source: `${defaultCity} ort.` }
      : m,
  )
  out.inputs = withChange(inputs, prev?.inputs)

  out.defaultBorsa = defaultBorsa
  out.defaultCity = defaultCity
  out.note = `Borsa: TOBB (seçilebilir) · mazot: EPDK bayi ort. (seçilebilir) · gübre/kanola manuel.`
  if (errors.length) out.errors = errors

  await writeFile(OUT, JSON.stringify(out, null, 2) + '\n')
  console.log(
    `✓ market.json — fx:${out.fx?.length ?? 0} haber:${out.news?.length ?? 0} borsa:${Object.keys(byBorsa).length} şehir:${Object.keys(byCity).length}`,
  )
  if (errors.length) console.warn('⚠️', errors.join(' | '))
}

main().catch((e) => {
  console.error('✗ scrape başarısız:', e)
  process.exit(1)
})
