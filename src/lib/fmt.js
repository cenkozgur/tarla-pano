export const tl = (n) =>
  new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

export const pct = (n) => `${n > 0 ? '+' : ''}${n.toFixed(2)}%`

export const saat = (d) =>
  new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }).format(new Date(d))

export const gun = (d) =>
  new Intl.DateTimeFormat('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(d))

export const gunKisa = (d) =>
  new Intl.DateTimeFormat('tr-TR', { weekday: 'short' }).format(new Date(d))
