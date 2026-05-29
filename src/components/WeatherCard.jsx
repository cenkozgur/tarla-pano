import { useState } from 'react'
import Card from './Card'
import { describeCode, hourlyForDate } from '../lib/weather'
import { gunKisa as _gun, saat } from '../lib/fmt'

export default function WeatherCard({ data, place }) {
  const c = data.current
  const [desc, emoji] = describeCode(c.weather_code)
  const d = data.daily
  const [openDay, setOpenDay] = useState(null) // tiklanan gunun index'i

  const selectedDate = openDay != null ? d.time[openDay] : null
  const hours = selectedDate ? hourlyForDate(data, selectedDate) : []

  return (
    <Card title={place || 'Hava Durumu'} icon="📍">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-4xl font-bold text-stone-800">{Math.round(c.temperature_2m)}°</div>
          <div className="text-sm text-stone-500">{desc}</div>
        </div>
        <div className="text-5xl">{emoji}</div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs text-stone-600">
        <Metric label="Nem" value={`${c.relative_humidity_2m}%`} icon="💧" />
        <Metric label="Rüzgâr" value={`${Math.round(c.wind_speed_10m)} km/s`} icon="💨" />
        <Metric label="Yağış" value={`${c.precipitation} mm`} icon="🌧️" />
      </div>

      <div className="mt-4 grid grid-cols-6 gap-1 text-center">
        {d.time.slice(0, 6).map((t, i) => {
          const [, dEmoji] = describeCode(d.weather_code[i])
          const active = openDay === i
          return (
            <button
              key={t}
              onClick={() => setOpenDay(active ? null : i)}
              className={`rounded-xl py-2 transition ${
                active ? 'bg-green-100 ring-1 ring-green-300' : 'bg-stone-50 hover:bg-stone-100'
              }`}
            >
              <div className="text-[10px] font-medium text-stone-500">{_gun(t)}</div>
              <div className="text-lg leading-tight">{dEmoji}</div>
              <div className="text-[11px] font-semibold text-stone-700">
                {Math.round(d.temperature_2m_max[i])}°
              </div>
              <div className="text-[10px] text-stone-400">{Math.round(d.temperature_2m_min[i])}°</div>
            </button>
          )
        })}
      </div>

      {selectedDate && (
        <div className="mt-3 rounded-xl bg-stone-50 p-2">
          <div className="mb-1 px-1 text-[11px] font-medium text-stone-500">Saatlik</div>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {hours.map((h) => {
              const [, hEmoji] = describeCode(h.code)
              return (
                <div
                  key={h.time}
                  className="flex min-w-[52px] flex-col items-center rounded-lg bg-white px-1 py-1.5 text-center ring-1 ring-black/5"
                >
                  <div className="text-[10px] text-stone-400">{saat(h.time)}</div>
                  <div className="text-base leading-tight">{hEmoji}</div>
                  <div className="text-xs font-semibold text-stone-700">{Math.round(h.temp)}°</div>
                  <div className="mt-0.5 text-[9px] text-blue-500">💧{h.pop}%</div>
                  <div className="text-[9px] text-stone-400">💨{Math.round(h.wind)}</div>
                </div>
              )
            })}
          </div>
          <div className="px-1 pt-0.5 text-[9px] text-stone-400">💧 yağış olasılığı · 💨 rüzgâr km/s</div>
        </div>
      )}
    </Card>
  )
}

function Metric({ label, value, icon }) {
  return (
    <div className="rounded-xl bg-stone-50 py-2">
      <div className="text-sm">{icon}</div>
      <div className="font-semibold text-stone-700">{value}</div>
      <div className="text-[10px] text-stone-400">{label}</div>
    </div>
  )
}
