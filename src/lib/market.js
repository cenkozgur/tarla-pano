// Piyasa verisini okur. Üretimde GitHub Actions cron'unun güncellediği
// raw.githubusercontent URL'inden, geliştirmede yerel public/data'dan gelir.
// VITE_DATA_URL .env.production'da tanımlı.
const DATA_URL = import.meta.env.VITE_DATA_URL || `${import.meta.env.BASE_URL}data/market.json`

export async function fetchMarket() {
  // no-store: tarayıcı HTTP cache'ini atla. Service worker NetworkFirst sayesinde
  // online'da taze veri gelir, offline'da son kaydedilen veri gösterilir.
  const r = await fetch(DATA_URL, { cache: 'no-store' })
  if (!r.ok) throw new Error('Piyasa verisi alınamadı')
  return r.json()
}
