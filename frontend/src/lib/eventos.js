// Bus de eventos de la app (usando window CustomEvent).
//
// Se usa cuando dos componentes distantes en el árbol necesitan
// enterarse de que algo cambió, sin acoplarlos con context ni prop
// drilling. Ejemplo: al marcar una notificación como enviada, el
// listado en Notificaciones y el toast global tienen que actualizarse.
//
// Preferimos esto a un refetch completo desde cada consumidor porque
// evita queries redundantes cuando la misma acción dispara varias vistas.

export const EVENTOS = {
  notifActualizada: 'neuplus:notif-actualizada',
}

export function emitirNotifActualizada(notificacion) {
  window.dispatchEvent(new CustomEvent(EVENTOS.notifActualizada, { detail: notificacion }))
}

/**
 * Suscribirse a un evento. Devuelve la función de cleanup para usarla
 * directo en el return de un useEffect.
 */
export function suscribirseA(nombreEvento, handler) {
  window.addEventListener(nombreEvento, handler)
  return () => window.removeEventListener(nombreEvento, handler)
}
