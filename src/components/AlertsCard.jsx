import { gun, saat } from '../lib/fmt'

// Don + ilaclama uyarilari. Ciftci icin en kritik kart -> en uste konur.
export default function AlertsCard({ frost, windows }) {
  const hasFrost = frost && frost.length
  const hasSpray = windows && windows.length

  return (
    <div className="space-y-2">
      {hasFrost &&
        frost.map((f) => (
          <div
            key={f.date}
            className={`flex items-start gap-3 rounded-2xl p-4 ring-1 ${
              f.level === 'don'
                ? 'bg-blue-50 ring-blue-200 text-blue-900'
                : 'bg-amber-50 ring-amber-200 text-amber-900'
            }`}
          >
            <span className="text-2xl">{f.level === 'don' ? '❄️' : '🥶'}</span>
            <div>
              <p className="font-semibold">
                {f.level === 'don' ? 'Don uyarısı' : 'Kırağı / don riski'}
              </p>
              <p className="text-sm opacity-80">
                {gun(f.date)} gecesi en düşük <b>{f.min.toFixed(0)}°C</b>. Hassas ekinleri koru.
              </p>
            </div>
          </div>
        ))}

      <div className="flex items-start gap-3 rounded-2xl bg-green-50 p-4 ring-1 ring-green-200 text-green-900">
        <span className="text-2xl">🌿</span>
        <div className="min-w-0">
          <p className="font-semibold">İlaçlama penceresi (24 saat)</p>
          {hasSpray ? (
            <ul className="mt-1 space-y-0.5 text-sm opacity-90">
              {windows.slice(0, 3).map((w, i) => (
                <li key={i}>
                  {saat(w.start)}–{saat(w.end)} · rüzgâr ≤ {w.maxWind.toFixed(0)} km/s
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm opacity-80">
              Önümüzdeki 24 saatte uygun pencere yok (rüzgâr/yağış/sıcaklık).
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
