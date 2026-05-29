import { useState } from 'react'
import { loadFields, addField, fieldSummary } from '../lib/defter'
import { tl } from '../lib/fmt'
import FieldDetail from './FieldDetail'

export default function Defter() {
  const [fields, setFields] = useState(loadFields())
  const [selectedId, setSelectedId] = useState(null)
  const [adding, setAdding] = useState(false)

  const reload = () => setFields(loadFields())
  const selected = fields.find((f) => f.id === selectedId)

  if (selected) {
    return (
      <FieldDetail
        field={selected}
        onBack={() => {
          setSelectedId(null)
          reload()
        }}
        onChanged={reload}
      />
    )
  }

  return (
    <div>
      <header className="py-4">
        <h1 className="text-xl font-bold text-green-800">📒 Tarla Defteri</h1>
        <p className="text-xs text-stone-400">Tarlalarını ve maliyet/gelir kayıtlarını tut</p>
      </header>

      {adding ? (
        <AddFieldForm
          onCancel={() => setAdding(false)}
          onSave={(data) => {
            addField(data)
            setAdding(false)
            reload()
          }}
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mb-4 w-full rounded-2xl bg-green-600 py-3 font-semibold text-white shadow-sm active:scale-[0.99]"
        >
          + Tarla Ekle
        </button>
      )}

      {fields.length === 0 && !adding ? (
        <p className="py-10 text-center text-sm text-stone-400">
          Henüz tarla yok. İlk tarlanı ekle, sonra ekim/gübre/ilaç/hasat kaydı tut.
        </p>
      ) : (
        <div className="space-y-2">
          {fields.map((f) => {
            const s = fieldSummary(f)
            return (
              <button
                key={f.id}
                onClick={() => setSelectedId(f.id)}
                className="flex w-full items-center justify-between rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-black/5 active:scale-[0.99]"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-stone-800">{f.name}</div>
                  <div className="text-[11px] text-stone-400">
                    {f.area} dönüm{f.crop ? ` · ${f.crop}` : ''} · {s.count} kayıt
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-bold ${s.net >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    ₺{tl(s.net)}
                  </div>
                  <div className="text-[10px] text-stone-400">net</div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function AddFieldForm({ onSave, onCancel }) {
  const [name, setName] = useState('')
  const [area, setArea] = useState('')
  const [crop, setCrop] = useState('')

  return (
    <div className="mb-4 space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <label className="block">
        <span className="mb-1 block text-[11px] font-medium text-stone-500">Tarla adı</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="örn. Dere tarla" className="input" autoFocus />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-stone-500">Alan (dönüm)</span>
          <input type="number" inputMode="decimal" value={area} onChange={(e) => setArea(e.target.value)} placeholder="0" className="input" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-stone-500">Ürün (ops.)</span>
          <input value={crop} onChange={(e) => setCrop(e.target.value)} placeholder="buğday" className="input" />
        </label>
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="flex-1 rounded-xl bg-stone-100 py-2.5 font-medium text-stone-600">İptal</button>
        <button
          onClick={() => name.trim() && onSave({ name, area, crop })}
          disabled={!name.trim()}
          className="flex-1 rounded-xl bg-green-600 py-2.5 font-semibold text-white disabled:opacity-40"
        >
          Kaydet
        </button>
      </div>
    </div>
  )
}
