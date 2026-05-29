import Card from './Card'
import { tl, pct } from '../lib/fmt'

function ChangeBadge({ change }) {
  const up = change >= 0
  return (
    <span className={`text-xs font-medium ${up ? 'text-green-600' : 'text-red-600'}`}>
      {up ? '▲' : '▼'} {pct(change)}
    </span>
  )
}

export function FxCard({ fx }) {
  return (
    <Card title="Döviz & Altın" icon="💱">
      <div className="space-y-2">
        {fx.map((x) => (
          <div key={x.code} className="flex items-center justify-between">
            <span className="text-sm font-medium text-stone-700">{x.name}</span>
            <div className="text-right">
              <div className="font-semibold text-stone-800">₺{tl(x.sell)}</div>
              <ChangeBadge change={x.change} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function Picker({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg bg-stone-100 px-2 py-1 text-xs font-medium text-stone-600"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function PricesCard({ byBorsa, fallback, selected, onSelect, note }) {
  const hasSel = byBorsa && Object.keys(byBorsa).length > 0
  const commodities = (hasSel && byBorsa[selected]?.items) || fallback || []
  if (!commodities.length) return null
  const action = hasSel ? (
    <Picker
      value={selected}
      onChange={onSelect}
      options={Object.entries(byBorsa).map(([k, v]) => ({ value: k, label: v.ad }))}
    />
  ) : null
  return (
    <Card title="Ürün Fiyatları" icon="🌾" action={action}>
      <div className="space-y-2">
        {commodities.map((x) => (
          <div key={x.key} className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-stone-700">{x.name}</div>
              <div className="text-[10px] text-stone-400">
                {x.source} · {x.date}
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-stone-800">
                {tl(x.price)} <span className="text-[10px] font-normal text-stone-400">{x.unit}</span>
              </div>
              <ChangeBadge change={x.change} />
            </div>
          </div>
        ))}
      </div>
      {note && <p className="mt-3 text-[10px] text-stone-400">ℹ️ {note}</p>}
    </Card>
  )
}

export function InputsCard({ inputs, byCity, selectedCity, onSelectCity }) {
  const hasCity = byCity && Object.keys(byCity).length > 0
  const items = inputs.map((x) =>
    x.key === 'motorin' && hasCity && byCity[selectedCity] != null
      ? { ...x, price: byCity[selectedCity], source: `${selectedCity} ort.` }
      : x,
  )
  const action = hasCity ? (
    <Picker
      value={selectedCity}
      onChange={onSelectCity}
      options={Object.keys(byCity).map((c) => ({ value: c, label: c }))}
    />
  ) : null
  return (
    <Card title="Girdi Maliyetleri" icon="⛽" action={action}>
      <div className="space-y-2">
        {items.map((x) => (
          <div key={x.key} className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-stone-700">{x.name}</div>
              {x.source && (
                <div className="text-[10px] text-stone-400">
                  {x.source}
                  {x.date ? ` · ${x.date}` : ''}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="font-semibold text-stone-800">
                {tl(x.price)} <span className="text-[10px] font-normal text-stone-400">{x.unit}</span>
              </div>
              <ChangeBadge change={x.change} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function NewsCard({ news }) {
  return (
    <Card title="Tarım Haberleri" icon="📰">
      <ul className="divide-y divide-stone-100">
        {news.map((n, i) => (
          <li key={i} className="py-2 first:pt-0 last:pb-0">
            <a href={n.url} target="_blank" rel="noreferrer" className="block">
              <p className="text-sm font-medium text-stone-700 leading-snug">{n.title}</p>
              <p className="text-[10px] text-stone-400">
                {n.source} · {n.date}
              </p>
            </a>
          </li>
        ))}
      </ul>
    </Card>
  )
}
