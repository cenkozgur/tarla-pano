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
import Defter from './components/Defter'

export default function App() {
  const [view, setView] = useState('pano')
  return (
    <>
      <div className="mx-auto max-w-md px-4 pb-24">
        {view === 'pano' ? <Pano /> : <Defter />}
      </div>
      <BottomNav view={view} setView={setView} />
    </>
  )
}

function BottomNav({ view, setView }) {
  const item = (key, icon, label) => (
    <button
      onClick={() => setView(key)}
      className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
        view === key ? 'text-green-700' : 'text-stone-400'
      }`}
    >
      <span className="text-xl">{icon}</span>
      {label}
    </button>
  )
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-stone-200 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-md">
        {item('pano', '🌾', 'Pano')}
        {item('defter', '📒', 'Defter')}
      </div>
    </nav>
  )
}

function Pano() {
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

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastLoad.current > 60_000) load()
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

  useEffect(() => {
    if (frost) maybeNotifyFrost(frost)
  }, [frost])

  return (
    <>
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
        <div className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">{err}</div>
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
        Hava: Open-Meteo · Döviz/altın: truncgil · Borsa: TOBB · Veriler bilgilendirme amaçlıdır
      </footer>
    </>
  )
}

function Skeleton({ label }) {
  return (
    <div className="animate-pulse rounded-2xl bg-white p-6 text-center text-sm text-stone-400 ring-1 ring-black/5">
      {label}
    </div>
  )
}
