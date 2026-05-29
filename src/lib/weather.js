// Open-Meteo: ucretsiz, API key yok, CORS acik. Ciftci icin onemli alanlari ceker
// ve don / ilaclama penceresi gibi turetilmis uyarilari hesaplar.

const WMO = {
  0: ['Açık', '☀️'], 1: ['Az bulutlu', '🌤️'], 2: ['Parçalı bulutlu', '⛅'], 3: ['Kapalı', '☁️'],
  45: ['Sisli', '🌫️'], 48: ['Kırağılı sis', '🌫️'],
  51: ['Hafif çisenti', '🌦️'], 53: ['Çisenti', '🌦️'], 55: ['Yoğun çisenti', '🌧️'],
  61: ['Hafif yağmur', '🌦️'], 63: ['Yağmur', '🌧️'], 65: ['Şiddetli yağmur', '🌧️'],
  66: ['Donan yağmur', '🌧️❄️'], 67: ['Şiddetli donan yağmur', '🌧️❄️'],
  71: ['Hafif kar', '🌨️'], 73: ['Kar', '🌨️'], 75: ['Yoğun kar', '❄️'], 77: ['Kar taneleri', '🌨️'],
  80: ['Sağanak', '🌦️'], 81: ['Kuvvetli sağanak', '🌧️'], 82: ['Çok kuvvetli sağanak', '⛈️'],
  85: ['Kar sağanağı', '🌨️'], 86: ['Yoğun kar sağanağı', '❄️'],
  95: ['Gök gürültülü', '⛈️'], 96: ['Dolulu fırtına', '⛈️'], 99: ['Şiddetli dolu fırtınası', '⛈️'],
}

export function describeCode(code) {
  return WMO[code] || ['—', '🌡️']
}

// Belirli bir gunun (YYYY-MM-DD) saatlik dilimini cikarir.
export function hourlyForDate(data, dateStr) {
  const h = data.hourly
  if (!h) return []
  const out = []
  for (let i = 0; i < h.time.length; i++) {
    if (!h.time[i].startsWith(dateStr)) continue
    out.push({
      time: h.time[i],
      temp: h.temperature_2m[i],
      precip: h.precipitation[i],
      pop: h.precipitation_probability[i] ?? 0,
      wind: h.wind_speed_10m[i],
      code: h.weather_code[i],
    })
  }
  return out
}

export async function fetchWeather(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: 'temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,weather_code',
    hourly: 'temperature_2m,precipitation,precipitation_probability,wind_speed_10m,relative_humidity_2m,weather_code',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weather_code,sunrise,sunset',
    timezone: 'auto',
    forecast_days: '6',
    wind_speed_unit: 'kmh',
  })
  const r = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
  if (!r.ok) throw new Error('Hava verisi alınamadı')
  return r.json()
}

// ---- Turetilmis uyarilar -------------------------------------------------

// Onumuzdeki 48 saatte gece minimumlari -> don riski
export function frostAlert(data) {
  const days = data.daily
  if (!days) return null
  const out = []
  for (let i = 0; i < Math.min(3, days.time.length); i++) {
    const min = days.temperature_2m_min[i]
    if (min <= 3) {
      out.push({
        date: days.time[i],
        min,
        level: min <= 0 ? 'don' : 'risk', // <=0 kesin don, 0-3 arasi kırağı/risk
      })
    }
  }
  return out.length ? out : null
}

// Ilaclama (puskurtme) icin uygun saatler:
// ruzgar dusuk (<15 km/h), yagis olasiligi dusuk (<20%), asiri sicak degil (<30C),
// nem cok dusuk degil (>30%). Onumuzdeki 24 saate bakar, ardisik uygun saatleri
// pencere olarak birlestirir.
export function sprayWindows(data) {
  const h = data.hourly
  if (!h) return []
  const now = new Date()
  const good = []
  for (let i = 0; i < h.time.length; i++) {
    const t = new Date(h.time[i])
    if (t < now) continue
    if (t - now > 24 * 3600 * 1000) break
    const wind = h.wind_speed_10m[i]
    const pop = h.precipitation_probability[i] ?? 0
    const temp = h.temperature_2m[i]
    const hum = h.relative_humidity_2m[i]
    const ok = wind < 15 && pop < 20 && temp < 30 && temp > 5 && hum > 30
    good.push({ t, ok, wind, pop, temp })
  }
  // ardisik uygun saatleri pencerelere grupla
  const windows = []
  let cur = null
  for (const g of good) {
    if (g.ok) {
      if (!cur) cur = { start: g.t, end: g.t, maxWind: g.wind }
      else { cur.end = g.t; cur.maxWind = Math.max(cur.maxWind, g.wind) }
    } else if (cur) {
      windows.push(cur)
      cur = null
    }
  }
  if (cur) windows.push(cur)
  // en az 2 saatlik pencereleri al
  return windows.filter((w) => w.end - w.start >= 2 * 3600 * 1000)
}
