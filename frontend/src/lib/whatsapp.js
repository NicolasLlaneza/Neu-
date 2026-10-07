// Utilidades para abrir WhatsApp Web / la app con un mensaje pre-cargado.
//
// Formato oficial de Meta: https://wa.me/<numero_internacional_sin_+>?text=<url_encoded>
// En desktop abre WhatsApp Web; en mobile intenta abrir la app y cae a web
// si no está instalada.

import { normalizarTelefono } from './telefono'
import { DEMO } from './demo'

/** Base URL del deep-link oficial de WhatsApp (Meta). */
export const WHATSAPP_BASE_URL = 'https://wa.me'

/**
 * Arma la URL de wa.me con el mensaje pre-cargado.
 * Devuelve null si el teléfono no se puede normalizar (evita abrir
 * WhatsApp con un número basura).
 *
 * El consumidor debe usar esta URL como href de un <a target="_blank">
 * — NO llamar window.open. Con noopener/noreferrer varios navegadores
 * (Firefox, Safari, Brave con shields) devuelven null aunque la
 * ventana sí se abra, y eso disparaba falsos "popup bloqueado".
 */
export function waMeUrl(telefono, mensaje) {
  const num = normalizarTelefono(telefono)
  if (!num) return null
  const texto = encodeURIComponent(mensaje ?? '')
  // Demo: los teléfonos son inventados. Sin número, WhatsApp abre el
  // selector de contactos con el mensaje cargado y no le escribe a nadie.
  if (DEMO) return `${WHATSAPP_BASE_URL}/?text=${texto}`
  return `${WHATSAPP_BASE_URL}/${num}?text=${texto}`
}
