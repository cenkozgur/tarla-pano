import { useEffect, useRef, useState } from 'react'
import { loadFields, addField, fieldSummary, exportData, importData } from '../lib/defter'
import { fetchMarket } from '../lib/market'
import { tl } from '../lib/fmt'
import FieldDetail from './FieldDetail'

export default function Defter() {
  const [fields, setFields] = useState(loadFields())
  const [selectedId, setSelectedId] = useState(null)
  const [adding, setAdding] = useState(false)
  const [catalog, setCatalog] = useState({ inputs: [], commodities: [] })

  // güncel girdi/ürün fiyatları -> kayıt eklerken otomatik maliyet/gelir
  useEffect(() => {
    fetchMarket()
      .then((m) => setCatalog({ inputs: m.inputs || [], commodities: m.commodities || [] }))
      .catch(() => {})
  }, [])

  const reload = () => setFields(loadFields())
  const fileRef = useRef(null)

  const handleExport = () => {
    const blob = new Blob([exportData()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tarla-defteri-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const res = importData(await file.text(), { merge: true })
      reload()
      alert(`İçe aktarıldı: ${res.fields} tarla, ${res.records} kayıt birleştirildi.`)
    } catch (err) {
      alert('Hata: ' + err.message)
    }
    e.target.value = ''
  }

  const selected = fields.find((f) => f.id === selectedId)

  if (selected) {
    return (
      <FieldDetail
        field={selected}
        catalog={catalog}
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

      {/* yedek */}
      <div className="mt-6 border-t border-stone-200 pt-4">
        <p className="mb-2 text-[11px] text-stone-400">
          Veriler bu cihazda saklanır. Telefon değişmeden önce yedek al.
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={fields.length === 0}
            className="flex-1 rounded-xl bg-stone-100 py-2.5 text-sm font-medium text-stone-600 disabled:opacity-40"
          >
            ⬇️ Yedek al
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex-1 rounded-xl bg-stone-100 py-2.5 text-sm font-medium text-stone-600"
          >
            ⬆️ Geri yükle
          </button>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" onChange={handleImport} className="hidden" />
      </div>
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
