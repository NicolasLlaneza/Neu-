// Utilidades para números de teléfono argentinos.

/**
 * Normaliza un teléfono al formato internacional sin '+' ni separadores.
 * Ej: "+54 9 261 234 5678" → "5492612345678"
 *     "0261 234-5678"       → "2612345678"  (sin código de país)
 */
export function normalizarTelefono(telefono) {
  if (typeof telefono !== 'string') return ''
  return telefono.replace(/\D/g, '')
}

/**
 * True si el teléfono normalizado parece un número argentino válido
 * (código país 54, 12–14 dígitos).
 */
export function esTelefonoArgentinoValido(telefono) {
  const num = normalizarTelefono(telefono)
  if (num.length < 12 || num.length > 14) return false
  return num.startsWith('54')
}

/**
 * Formatea un teléfono para mostrar visualmente en pantalla.
 * Ej: "5492612345678" → "+54 9 261 234 5678"
 * Si el input no es reconocible, devuelve el original.
 */
export function formatearTelefonoDisplay(telefono) {
  const num = normalizarTelefono(telefono)
  if (!num.startsWith('54') || num.length < 12) return telefono
  // 54 + 9 (móvil) + 3 (área) + 4 + 4  → +54 9 XXX XXX XXXX
  const pais = num.slice(0, 2)
  const movil = num[2]
  if (movil !== '9') {
    return `+${pais} ${num.slice(2, 5)} ${num.slice(5, 9)}-${num.slice(9)}`
  }
  const area = num.slice(3, 6)
  const parte1 = num.slice(6, 9)
  const parte2 = num.slice(9)
  return `+${pais} ${movil} ${area} ${parte1} ${parte2}`
}
