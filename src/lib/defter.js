// Tarla Defteri — tarlalar ve kayıtlar telefonda (localStorage) saklanır. Backend yok.
// Tarlalar elle tanımlanır (TKGM gerekmez). Her tarlaya ekim/gübre/ilaç/sulama/hasat
// kaydı eklenir; maliyet ve gelir toplanıp dönüm başı net kâr hesaplanır.

const FIELDS_KEY = 'tarla.fields'
const RECORDS_KEY = 'tarla.records'
const REMINDERS_KEY = 'tarla.reminders'

export const RECORD_TYPES = [
  { key: 'ekim', label: 'Ekim', icon: '🌱', kind: 'cost' },
  { key: 'gubre', label: 'Gübre', icon: '💊', kind: 'cost' },
  { key: 'ilac', label: 'İlaçlama', icon: '🧪', kind: 'cost' },
  { key: 'sulama', label: 'Sulama', icon: '💧', kind: 'cost' },
  { key: 'surme', label: 'Sürme / Toprak', icon: '🚜', kind: 'cost' },
  { key: 'hasat', label: 'Hasat', icon: '🌾', kind: 'revenue' },
  { key: 'diger', label: 'Diğer', icon: '📝', kind: 'cost' },
]

export const typeOf = (key) => RECORD_TYPES.find((t) => t.key === key) || RECORD_TYPES.at(-1)

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.floor(Math.random() * 1e6)}`

const read = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key)) || []
  } catch {
    return []
  }
}
const write = (key, val) => localStorage.setItem(key, JSON.stringify(val))

// ---- tarlalar ----
export const loadFields = () => read(FIELDS_KEY)

export function addField({ name, area, crop }) {
  const fields = loadFields()
  const f = { id: uid(), name: name.trim(), area: Number(area) || 0, crop: (crop || '').trim(), createdAt: Date.now() }
  fields.push(f)
  write(FIELDS_KEY, fields)
  return f
}

export function updateField(id, patch) {
  const fields = loadFields().map((f) => (f.id === id ? { ...f, ...patch } : f))
  write(FIELDS_KEY, fields)
}

export function deleteField(id) {
  write(FIELDS_KEY, loadFields().filter((f) => f.id !== id))
  write(RECORDS_KEY, loadRecords().filter((r) => r.fieldId !== id))
}

// ---- kayıtlar ----
export const loadRecords = () => read(RECORDS_KEY)

export const recordsOf = (fieldId) =>
  loadRecords()
    .filter((r) => r.fieldId === fieldId)
    .sort((a, b) => (a.date < b.date ? 1 : -1))

export function addRecord(fieldId, { type, date, note, amount, unit, cost, revenue }) {
  const records = loadRecords()
  const r = {
    id: uid(),
    fieldId,
    type,
    date: date || new Date().toISOString().slice(0, 10),
    note: (note || '').trim(),
    amount: amount === '' || amount == null ? null : Number(amount),
    unit: (unit || '').trim(),
    cost: Number(cost) || 0,
    revenue: Number(revenue) || 0,
    createdAt: Date.now(),
  }
  records.push(r)
  write(RECORDS_KEY, records)
  return r
}

export function deleteRecord(id) {
  write(RECORDS_KEY, loadRecords().filter((r) => r.id !== id))
}

// ---- hatırlatmalar / görevler ----
const today = () => new Date().toISOString().slice(0, 10)

export const loadReminders = () => read(REMINDERS_KEY)

export function addReminder({ fieldId, title, date }) {
  const list = loadReminders()
  const r = { id: uid(), fieldId: fieldId || null, title: title.trim(), date: date || today(), done: false, createdAt: Date.now() }
  list.push(r)
  write(REMINDERS_KEY, list)
  return r
}

export function toggleReminder(id) {
  write(REMINDERS_KEY, loadReminders().map((r) => (r.id === id ? { ...r, done: !r.done } : r)))
}

export function deleteReminder(id) {
  write(REMINDERS_KEY, loadReminders().filter((r) => r.id !== id))
}

export const remindersOf = (fieldId) =>
  loadReminders().filter((r) => r.fieldId === fieldId).sort((a, b) => (a.date < b.date ? -1 : 1))

// Pano için: tamamlanmamış + bugün/gecikmiş/yaklaşan (daysAhead gün) — tarla adıyla
export function dueReminders(daysAhead = 3) {
  const t = today()
  const limit = new Date(Date.now() + daysAhead * 86400000).toISOString().slice(0, 10)
  const fields = new Map(loadFields().map((f) => [f.id, f.name]))
  return loadReminders()
    .filter((r) => !r.done && r.date <= limit)
    .map((r) => ({ ...r, fieldName: r.fieldId ? fields.get(r.fieldId) || null : null, overdue: r.date < t, isToday: r.date === t }))
    .sort((a, b) => (a.date < b.date ? -1 : 1))
}

// ---- yedek (içe/dışa aktar) ----
export function exportData() {
  return JSON.stringify(
    {
      app: 'tarla-pano',
      version: 1,
      exportedAt: new Date().toISOString(),
      fields: loadFields(),
      records: loadRecords(),
      reminders: loadReminders(),
    },
    null,
    2,
  )
}

// merge=true: aynı id'leri atlayıp birleştirir; false: tümünü değiştirir
export function importData(json, { merge = true } = {}) {
  const data = typeof json === 'string' ? JSON.parse(json) : json
  if (!Array.isArray(data?.fields) || !Array.isArray(data?.records)) {
    throw new Error('Geçersiz yedek dosyası')
  }
  const rem = Array.isArray(data.reminders) ? data.reminders : []
  if (merge) {
    const fIds = new Set(loadFields().map((f) => f.id))
    const rIds = new Set(loadRecords().map((r) => r.id))
    const mIds = new Set(loadReminders().map((m) => m.id))
    write(FIELDS_KEY, [...loadFields(), ...data.fields.filter((f) => !fIds.has(f.id))])
    write(RECORDS_KEY, [...loadRecords(), ...data.records.filter((r) => !rIds.has(r.id))])
    write(REMINDERS_KEY, [...loadReminders(), ...rem.filter((m) => !mIds.has(m.id))])
  } else {
    write(FIELDS_KEY, data.fields)
    write(RECORDS_KEY, data.records)
    write(REMINDERS_KEY, rem)
  }
  return { fields: data.fields.length, records: data.records.length }
}

// ---- özet ----
export function fieldSummary(field) {
  const recs = recordsOf(field.id)
  const cost = recs.reduce((s, r) => s + (r.cost || 0), 0)
  const revenue = recs.reduce((s, r) => s + (r.revenue || 0), 0)
  const net = revenue - cost
  const area = field.area || 0
  return {
    cost,
    revenue,
    net,
    count: recs.length,
    costPerDonum: area ? cost / area : 0,
    netPerDonum: area ? net / area : 0,
  }
}
