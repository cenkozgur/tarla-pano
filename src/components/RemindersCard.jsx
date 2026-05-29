import { useState } from 'react'
import Card from './Card'
import { dueReminders, toggleReminder } from '../lib/defter'
import { gun } from '../lib/fmt'

function dateLabel(r) {
  const t = new Date().toISOString().slice(0, 10)
  if (r.date === t) return { text: 'Bugün', tone: 'text-green-700' }
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  if (r.date === tomorrow) return { text: 'Yarın', tone: 'text-stone-500' }
  if (r.overdue) {
    const days = Math.round((new Date(t) - new Date(r.date)) / 86400000)
    return { text: `${days} gün gecikti`, tone: 'text-red-600' }
  }
  return { text: gun(r.date), tone: 'text-stone-500' }
}

export default function RemindersCard() {
  const [items, setItems] = useState(() => dueReminders())
  if (!items.length) return null

  const complete = (id) => {
    toggleReminder(id)
    setItems(dueReminders())
  }

  return (
    <Card title="Yapılacaklar" icon="📋">
      <div className="space-y-2">
        {items.map((r) => {
          const lbl = dateLabel(r)
          return (
            <div key={r.id} className="flex items-center gap-3">
              <button
                onClick={() => complete(r.id)}
                className="h-5 w-5 shrink-0 rounded-md border-2 border-stone-300 active:scale-90"
                aria-label="Tamamla"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-stone-700">{r.title}</div>
                {r.fieldName && <div className="text-[10px] text-stone-400">{r.fieldName}</div>}
              </div>
              <span className={`shrink-0 text-[11px] font-medium ${lbl.tone}`}>{lbl.text}</span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
