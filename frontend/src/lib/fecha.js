// Utilidades para trabajar con fechas en formato argentino.
//
// El formato ISO YYYY-MM-DD se guarda en la BD como string sin timezone.
// Nunca usar new Date('2026-07-13') para parsear fechas locales — el navegador
// asume UTC y en Argentina (UTC-3) queda como "12/07/2026". Usar split.

/**
 * Convierte 'YYYY-MM-DD' → 'DD/MM/YYYY'.
 */
export function formatFechaAR(iso) {
  if (typeof iso !== 'string' || !iso.includes('-')) return iso
  return iso.split('-').reverse().join('/')
}

/**
 * Fecha de hoy en formato 'YYYY-MM-DD' (hora Argentina UTC-3).
 * Útil para inputs type="date" y comparaciones en la BD.
 */
export function fechaHoyAR() {
  const now = new Date()
  now.setHours(now.getHours() - 3)
  return now.toISOString().split('T')[0]
}

/**
 * Formatea un timestamp ISO a 'DD/MM/YYYY HH:MM' (hora Argentina).
 * Ej: '2026-07-13T18:30:00Z' → '13/07/2026 15:30'
 */
export function formatFechaHoraAR(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    hour12: false,
  })
}
