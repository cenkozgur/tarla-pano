// Piyasa verisini okur. Üretimde GitHub Actions cron'unun güncellediği
// raw.githubusercontent URL'inden, geliştirmede yerel public/data'dan gelir.
// VITE_DATA_URL .env.production'da tanımlı.
const DATA_URL = import.meta.env.VITE_DATA_URL || `${import.meta.env.BASE_URL}data/market.json`

export async function fetchMarket({ fresh = false } = {}) {
  // fresh=true (manuel refresh): ?t= ile CDN'i de del -> mutlak en taze veri.
  // fresh=false (açılış/arka plan): düz URL -> service worker offline'da cache'ten verir.
  const url = fresh ? `${DATA_URL}?t=${Date.now()}` : DATA_URL
  const r = await fetch(url, { cache: 'no-store' })
  if (!r.ok) throw new Error('Piyasa verisi alınamadı')
  return r.json()
}
