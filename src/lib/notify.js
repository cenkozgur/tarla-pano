// Bildirim temeli. Backend'siz: app ön plandayken don tespit edilince bildirim gösterir.
// NOT: App tamamen kapalıyken (özellikle iOS) güvenilir push için serverless sender +
// VAPID gerekir — sonraki adım. Buradaki anahtar/izin akışı o entegrasyonda yeniden kullanılır.

const KEY = 'tarla.frostAlerts'

export function notifySupported() {
  return 'Notification' in window && 'serviceWorker' in navigator
}

export function frostAlertsOn() {
  return localStorage.getItem(KEY) === 'on'
}

export function permission() {
  return notifySupported() ? Notification.permission : 'unsupported'
}

export async function enableFrostAlerts() {
  if (!notifySupported()) return 'unsupported'
  let p = Notification.permission
  if (p === 'default') p = await Notification.requestPermission()
  if (p === 'granted') {
    localStorage.setItem(KEY, 'on')
    return 'on'
  }
  return p // 'denied'
}

export function disableFrostAlerts() {
  localStorage.removeItem(KEY)
}

// Günde bir kez bildir (her foreground'da spam yapma)
export async function maybeNotifyFrost(frost) {
  if (!frost || !frost.length || !frostAlertsOn() || Notification.permission !== 'granted') return
  const today = new Date().toISOString().slice(0, 10)
  if (localStorage.getItem('tarla.frostNotified') === today) return

  const worst = frost.reduce((a, b) => (b.min < a.min ? b : a))
  const body =
    worst.level === 'don'
      ? `Bu gece en düşük ${Math.round(worst.min)}°C — don bekleniyor. Hassas ekinleri koru.`
      : `Bu gece en düşük ${Math.round(worst.min)}°C — kırağı/don riski.`
  try {
    const reg = await navigator.serviceWorker.ready
    await reg.showNotification('❄️ Don Uyarısı — Tarla Panosu', {
      body,
      icon: `${import.meta.env.BASE_URL}pwa-192.png`,
      badge: `${import.meta.env.BASE_URL}pwa-192.png`,
      tag: 'frost',
    })
    localStorage.setItem('tarla.frostNotified', today)
  } catch {
    /* SW hazır değilse sessiz geç */
  }
}
