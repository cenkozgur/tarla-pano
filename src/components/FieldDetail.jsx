import { useState } from 'react'
import { RECORD_TYPES, typeOf, recordsOf, addRecord, deleteRecord, deleteField, fieldSummary } from '../lib/defter'
import { tl, gun } from '../lib/fmt'

export default function FieldDetail({ field, onBack, onChanged }) {
  const [, force] = useState(0)
  const [adding, setAdding] = useState(false)
  const refresh = () => {
    force((n) => n + 1)
    onChanged?.()
  }

  const recs = recordsOf(field.id)
  const s = fieldSummary(field)

  const removeField = () => {
    if (confirm(`"${field.name}" tarlası ve tüm kayıtları silinsin mi?`)) {
      deleteField(field.id)
      onBack()
    }
  }
  const removeRecord = (id) => {
    deleteRecord(id)
    refresh()
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <button onClick={onBack} className="rounded-full bg-white p-2 shadow-sm ring-1 ring-black/5">←</button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold text-stone-800">{field.name}</h2>
          <p className="text-[11px] text-stone-400">
            {field.area} dönüm{field.crop ? ` · ${field.crop}` : ''}
          </p>
        </div>
        <button onClick={removeField} className="rounded-full bg-white p-2 text-red-500 shadow-sm ring-1 ring-black/5">🗑️</button>
      </div>

      {/* özet */}
      <div className="mb-4 grid grid-cols-3 gap-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5 text-center">
        <Stat label="Maliyet" value={`₺${tl(s.cost)}`} tone="text-red-600" />
        <Stat label="Gelir" value={`₺${tl(s.revenue)}`} tone="text-green-600" />
        <Stat label="Net" value={`₺${tl(s.net)}`} tone={s.net >= 0 ? 'text-green-700' : 'text-red-700'} />
        {field.area > 0 && (
          <div className="col-span-3 border-t border-stone-100 pt-2 text-[11px] text-stone-500">
            Dönüm başı net: <b className={s.netPerDonum >= 0 ? 'text-green-700' : 'text-red-700'}>₺{tl(s.netPerDonum)}</b>
          </div>
        )}
      </div>

      {adding ? (
        <RecordForm
          onCancel={() => setAdding(false)}
          onSave={(data) => {
            addRecord(field.id, data)
            setAdding(false)
            refresh()
          }}
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mb-4 w-full rounded-2xl bg-green-600 py-3 font-semibold text-white shadow-sm active:scale-[0.99]"
        >
          + Kayıt Ekle
        </button>
      )}

      {/* kayıt listesi */}
      {recs.length === 0 ? (
        <p className="py-8 text-center text-sm text-stone-400">Henüz kayıt yok. İlk işlemini ekle.</p>
      ) : (
        <div className="space-y-2">
          {recs.map((r) => {
            const t = typeOf(r.type)
            return (
              <div key={r.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5">
                <span className="text-xl">{t.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-stone-700">{t.label}</span>
                    <span className="text-[11px] text-stone-400">{gun(r.date)}</span>
                  </div>
                  {(r.note || r.amount != null) && (
                    <p className="truncate text-[11px] text-stone-500">
                      {r.amount != null ? `${r.amount}${r.unit ? ' ' + r.unit : ''}` : ''}
                      {r.note ? (r.amount != null ? ' · ' : '') + r.note : ''}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  {r.revenue > 0 && <div className="text-sm font-semibold text-green-600">+₺{tl(r.revenue)}</div>}
                  {r.cost > 0 && <div className="text-sm font-semibold text-red-600">-₺{tl(r.cost)}</div>}
                  <button onClick={() => removeRecord(r.id)} className="text-[10px] text-stone-300">sil</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, tone }) {
  return (
    <div>
      <div className={`text-sm font-bold ${tone}`}>{value}</div>
      <div className="text-[10px] text-stone-400">{label}</div>
    </div>
  )
}

function RecordForm({ onSave, onCancel }) {
  const [type, setType] = useState('gubre')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [amount, setAmount] = useState('')
  const [unit, setUnit] = useState('kg')
  const [money, setMoney] = useState('')
  const [note, setNote] = useState('')
  const isRevenue = typeOf(type).kind === 'revenue'

  const save = () => {
    onSave({
      type,
      date,
      note,
      amount,
      unit,
      cost: isRevenue ? 0 : money,
      revenue: isRevenue ? money : 0,
    })
  }

  return (
    <div className="mb-4 space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div className="flex flex-wrap gap-1.5">
        {RECORD_TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => setType(t.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              type === t.key ? 'bg-green-600 text-white' : 'bg-stone-100 text-stone-600'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <Field label="Tarih">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Miktar (opsiyonel)">
          <input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="input" />
        </Field>
        <Field label="Birim">
          <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="kg / lt / çuval" className="input" />
        </Field>
      </div>

      <Field label={isRevenue ? 'Gelir (₺)' : 'Maliyet (₺)'}>
        <input type="number" inputMode="decimal" value={money} onChange={(e) => setMoney(e.target.value)} placeholder="0" className="input" />
      </Field>

      <Field label="Not (opsiyonel)">
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="örn. üre, 2. atım" className="input" />
      </Field>

      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="flex-1 rounded-xl bg-stone-100 py-2.5 font-medium text-stone-600">İptal</button>
        <button onClick={save} className="flex-1 rounded-xl bg-green-600 py-2.5 font-semibold text-white">Kaydet</button>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-stone-500">{label}</span>
      {children}
    </label>
  )
}
