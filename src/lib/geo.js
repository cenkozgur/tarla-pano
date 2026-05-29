// Konum alma + ters-geocode (sehir adi). Hepsi ucretsiz, key gerekmez.

const FALLBACK = { lat: 39.925, lon: 32.866, name: 'Ankara (varsayılan)' } // Türkiye merkez

export function getPosition() {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(FALLBACK)
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, name: null }),
      () => resolve(FALLBACK),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 },
    )
  })
}

// BigDataCloud ucretsiz, CORS acik, key yok
export async function reverseGeocode(lat, lon) {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=tr`
    const r = await fetch(url)
    if (!r.ok) return null
    const d = await r.json()
    const parts = [d.city || d.locality, d.principalSubdivision].filter(Boolean)
    return parts.length ? [...new Set(parts)].join(', ') : null
  } catch {
    return null
  }
}
