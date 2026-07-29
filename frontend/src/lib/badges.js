// Configuración de badges y colores semánticos usados en varias páginas.
//
// Centralizado acá para no tener labels/colores duplicados y para que
// cambiar la paleta sea un solo lugar.
//
// Los tonos usan las variables de Tailwind (definidas en tailwind.config.js)
// para no hardcodear valores hex en el JSX.

export const estadoCliente = {
  nuevo:   { label: 'Nuevo',   color: '#666666' },
  ok:      { label: 'OK',      color: '#16a34a' },
  proximo: { label: 'Próximo', color: '#d97706' },
  urgente: { label: 'Urgente', color: '#910000' },
}

export const estadoNotificacion = {
  pendiente: { label: 'Pendiente', color: '#d97706' },
  enviada:   { label: 'Enviada',   color: '#16a34a' },
  fallida:   { label: 'Fallida',   color: '#910000' },
  cancelada: { label: 'Cancelada', color: '#555555' },
}

// Los importadores existentes se mantienen sin cambios.
