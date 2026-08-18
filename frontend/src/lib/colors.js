// Paleta semántica compartida entre JS/JSX y tailwind.config.cjs.
//
// Los estilos que aplican colores por className usan los tokens de Tailwind
// (`bg-warning`, `text-success`, etc.) definidos en tailwind.config.cjs.
// Los estilos inline (que a veces necesitan valor hex con opacidad en JS)
// y las tablas semánticas (badges.js, gráficos) importan de acá.
//
// IMPORTANTE: si cambiás un valor acá, actualizá también tailwind.config.cjs
// para que las clases utilitarias sigan matcheando el mismo tono.

export const COLORS = {
  // Marca
  red:      '#910000',    // rojo Calper
  redBright:'#ff0000',    // hover/focus

  // Semánticos (estado)
  success:  '#16a34a',    // verde — OK, enviada, cobrado
  warning:  '#d97706',    // ámbar — próximo, pendiente
  danger:   '#910000',    // rojo — urgente, fallida (usamos el rojo de marca)
  neutral:  '#666666',    // gris — nuevo
  muted:    '#555555',    // gris más oscuro — cancelada

  // Fondos / superficies (matchear con tailwind.config.cjs colors.dark)
  dark:     '#0d0d0d',
  darkPanel:'#1a1a1a',    // dark-200
  darkBorder:'#2a2a2a',   // dark-400

  // Texto
  textPrimary:   '#f5f5f5', // gray-100
  textSecondary: '#b8b8b8', // gray-200
}
