export const tl = (n) =>
  new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

export const pct = (n) => `${n > 0 ? '+' : ''}${n.toFixed(2)}%`

export const saat = (d) =>
  new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }).format(new Date(d))

export const gun = (d) =>
  new Intl.DateTimeFormat('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(d))

export const gunKisa = (d) =>
  new Intl.DateTimeFormat('tr-TR', { weekday: 'short' }).format(new Date(d))

// göreli zaman: "az önce" / "12 dk önce" / "3 saat önce" / "2 gün önce"
export const oncesi = (d) => {
  const dk = Math.round((Date.now() - new Date(d).getTime()) / 60000)
  if (dk < 1) return 'az önce'
  if (dk < 60) return `${dk} dk önce`
  const s = Math.round(dk / 60)
  if (s < 24) return `${s} saat önce`
  return `${Math.round(s / 24)} gün önce`
}
