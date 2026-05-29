import { useState } from 'react'
import {
  notifySupported,
  permission,
  frostAlertsOn,
  enableFrostAlerts,
  disableFrostAlerts,
} from '../lib/notify'

export default function NotifyCard() {
  const [on, setOn] = useState(frostAlertsOn())
  const [perm, setPerm] = useState(permission())

  if (!notifySupported()) return null

  const toggle = async () => {
    if (on) {
      disableFrostAlerts()
      setOn(false)
    } else {
      const res = await enableFrostAlerts()
      setPerm(permission())
      setOn(res === 'on')
    }
  }

  return (
    <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div className="min-w-0 pr-3">
        <p className="text-sm font-semibold text-stone-700">❄️ Don uyarısı bildirimi</p>
        <p className="text-[11px] text-stone-400">
          {perm === 'denied'
            ? 'Tarayıcı bildirimleri engellenmiş — ayarlardan izin ver.'
            : 'Don beklenen günlerde uyarı al (app açıkken).'}
        </p>
      </div>
      <button
        onClick={toggle}
        disabled={perm === 'denied'}
        className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-40 ${
          on ? 'bg-green-600' : 'bg-stone-300'
        }`}
        aria-pressed={on}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${
            on ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </button>
    </div>
  )
}
