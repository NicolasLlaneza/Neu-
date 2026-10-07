// Logo oficial NEU+ Neumáticos.
// La versión "full" usa el arte con brillos del manual de marca
// (recortado sin anotaciones desde pagina_02.png → logo.png). Se sirve
// desde /public para que Vite no lo procese como asset y quede
// referenciable con path absoluto.
// La versión "compact" queda como texto para conservar legibilidad en el
// topbar mobile, respetando la tipografía Montserrat del manual.
//
// En modo demo (lib/demo.js) se muestra la marca genérica de Bitácora,
// en texto: el build de demo no incluye logo.png.

import { COLORS } from '@/lib/colors'
import { NOMBRE_MARCA } from '@/lib/empresa'
import { DEMO } from '@/lib/demo'

const LOGO_URL = '/logo.png'

function LogoDemo({ className, compact }) {
  return (
    <div
      className={`flex flex-col items-center ${className}`}
      style={{ fontFamily: 'Montserrat, sans-serif', lineHeight: 1 }}
    >
      <div style={{ fontWeight: 900, letterSpacing: '0.04em', fontSize: compact ? '1.35rem' : '1.75rem' }}>
        <span style={{ color: COLORS.textPrimary }}>BITÁCORA</span>
        <span style={{ color: COLORS.red }}>.</span>
      </div>
      {!compact && (
        <div style={{ color: COLORS.textSecondary, fontSize: '0.65rem', fontWeight: 500, letterSpacing: '0.2em', marginTop: '0.4rem' }}>
          {NOMBRE_MARCA.toUpperCase()}
        </div>
      )}
    </div>
  )
}

export default function Logo({ className = '', compact = false }) {
  if (DEMO) return <LogoDemo className={className} compact={compact} />

  // Compact: una línea, sin subtítulo, ideal para topbar mobile
  if (compact) {
    return (
      <div
        className={className}
        style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 900, letterSpacing: '0.05em', lineHeight: 1 }}
      >
        <span style={{ color: COLORS.textPrimary, fontSize: '1.5rem' }}>NEU</span>
        <span style={{ color: COLORS.red, fontSize: '1.5rem' }}>+</span>
      </div>
    )
  }

  // Full: arte oficial con brillos, para login y consulta pública
  return (
    <img
      src={LOGO_URL}
      alt={NOMBRE_MARCA}
      className={`w-40 sm:w-48 h-auto ${className}`}
      draggable={false}
    />
  )
}
