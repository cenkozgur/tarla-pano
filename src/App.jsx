import { useCallback, useEffect, useRef, useState } from 'react'
import { getPosition, reverseGeocode } from './lib/geo'
import { fetchWeather, frostAlert, sprayWindows } from './lib/weather'
import { fetchMarket } from './lib/market'
import { saat } from './lib/fmt'
import { maybeNotifyFrost } from './lib/notify'
import WeatherCard from './components/WeatherCard'
import AlertsCard from './components/AlertsCard'
import NotifyCard from './components/NotifyCard'
import { FxCard, PricesCard, InputsCard, NewsCard } from './components/MarketCard'

export default function App() {
  const [weather, setWeather] = useState(null)
  const [place, setPlace] = useState(null)
  const [market, setMarket] = useState(null)
  const [err, setErr] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [syncedAt, setSyncedAt] = useState(null)
  const lastLoad = useRef(0)

  const load = useCallback(async () => {
    setSyncing(true)
    setErr(null)
    try {
      const pos = await getPosition()
      const [w, name] = await Promise.all([
        fetchWeather(pos.lat, pos.lon),
        pos.name ? Promise.resolve(pos.name) : reverseGeocode(pos.lat, pos.lon),
      ])
      setWeather(w)
      setPlace(name)
    } catch (e) {
      setErr(e.message)
    }
    try {
      setMarket(await fetchMarket())
    } catch (e) {
      setErr((p) => p || e.message)
    }
    lastLoad.current = Date.now()
    setSyncedAt(new Date())
    setSyncing(false)
  }, [])

  // ilk açılış
  useEffect(() => {
    load()
  }, [load])

  // app öne geldiğinde / sekme görünür olunca tazele (60 sn'den eskiyse)
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastLoad.current > 60_000) {
        load()
      }
    }
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [load])

  const frost = weather ? frostAlert(weather) : null
  const windows = weather ? sprayWindows(weather) : null

  // don tespit edilince (ve kullanıcı açtıysa) günde bir bildirim
  useEffect(() => {
    if (frost) maybeNotifyFrost(frost)
  }, [frost])

  return (
    <div className="mx-auto max-w-md px-4 pb-10">
      <header className="flex items-center justify-between py-4">
        <div>
          <h1 className="text-xl font-bold text-green-800">🌾 Tarla Panosu</h1>
          <p className="text-xs text-stone-400">
            {syncedAt ? `Güncellendi ${saat(syncedAt)}` : 'Çiftçinin günlük ekranı'}
          </p>
        </div>
        <button
          onClick={load}
          disabled={syncing}
          className="rounded-full bg-white p-2 text-lg shadow-sm ring-1 ring-black/5 active:scale-95 disabled:opacity-50"
          aria-label="Yenile"
        >
          <span className={syncing ? 'inline-block animate-spin' : ''}>🔄</span>
        </button>
      </header>

      {err && (
        <div className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
          {err}
        </div>
      )}

      <div className="space-y-4">
        {weather ? (
          <>
            <AlertsCard frost={frost} windows={windows} />
            <WeatherCard data={weather} place={place} />
            <NotifyCard />
          </>
        ) : (
          !err && <Skeleton label="Hava durumu yükleniyor…" />
        )}

        {market ? (
          <>
            <FxCard fx={market.fx} />
            <PricesCard commodities={market.commodities} note={market.note} />
            {market.inputs && <InputsCard inputs={market.inputs} />}
            <NewsCard news={market.news} />
          </>
        ) : (
          !err && <Skeleton label="Piyasa verisi yükleniyor…" />
        )}
      </div>

      <footer className="pt-6 text-center text-[10px] text-stone-300">
        Hava: Open-Meteo · Döviz/altın: truncgil · Veriler bilgilendirme amaçlıdır
      </footer>
    </div>
  )
}

function Skeleton({ label }) {
  return (
    <div className="animate-pulse rounded-2xl bg-white p-6 text-center text-sm text-stone-400 ring-1 ring-black/5">
      {label}
    </div>
  )
}
