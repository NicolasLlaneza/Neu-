// ─────────────────────────────────────────────────────────────────────────────
// send-notification
// Envía un mensaje de WhatsApp para una notificación específica.
//
// Body esperado: { notificacion_id: string }
//
// El phone_number_id se lee de la tabla `configuracion_whatsapp` (poblada
// por el Embedded Signup del cliente). Si no hay config, cae al env var
// WHATSAPP_PHONE_NUMBER_ID como fallback para el flujo de desarrollo.
//
// Variables de entorno:
//   WHATSAPP_ACCESS_TOKEN     — Token permanente del System User (requerido)
//   INTERNAL_SECRET           — Secret compartido para llamadas internas (requerido)
//   WHATSAPP_PHONE_NUMBER_ID  — Fallback si no hay fila en configuracion_whatsapp
// ─────────────────────────────────────────────────────────────────────────────

import { serve }        from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ACCESS_TOKEN     = Deno.env.get('WHATSAPP_ACCESS_TOKEN')!
const INTERNAL_SECRET  = Deno.env.get('INTERNAL_SECRET')!
const FALLBACK_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req: Request) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Dos formas de auth:
  // 1. INTERNAL_SECRET: llamadas internas (cron → process-notifications → send-notification)
  // 2. JWT de admin activo: llamadas desde el frontend (botón "Enviar ahora")
  const internalSecret = req.headers.get('x-internal-secret')
  const isInternalCall = internalSecret === INTERNAL_SECRET

  if (!isInternalCall) {
    const authHeader = req.headers.get('Authorization') ?? ''
    const jwt = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(jwt)
    if (!user) return json({ error: 'No autorizado' }, 401)

    const { data: profile } = await supabase
      .from('profiles')
      .select('activo')
      .eq('id', user.id)
      .single()

    if (!profile?.activo) return json({ error: 'Solo admins activos' }, 403)
  }

  const { notificacion_id } = await req.json()
  if (!notificacion_id) return json({ error: 'notificacion_id requerido' }, 400)

  // Resolver phone_number_id: preferir la config en BD (Embedded Signup),
  // si no hay, usar el env var como fallback (flujo de desarrollo)
  const { data: config } = await supabase
    .from('configuracion_whatsapp')
    .select('phone_number_id')
    .maybeSingle()

  const phoneNumberId = config?.phone_number_id ?? FALLBACK_PHONE_NUMBER_ID
  if (!phoneNumberId) {
    return json({
      error: 'WhatsApp no está configurado. Conectá una cuenta en Config → WhatsApp.',
    }, 500)
  }

  const whatsappApiUrl = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`

  // Buscar la notificación pendiente con datos del cliente
  const { data: notif, error: fetchError } = await supabase
    .from('notificaciones')
    .select('*, clientes(nombre, telefono, acepta_whatsapp)')
    .eq('id', notificacion_id)
    .eq('estado', 'pendiente')
    .single()

  if (fetchError || !notif) {
    return json({ error: 'Notificación no encontrada o ya procesada' }, 404)
  }

  // Defense-in-depth: no enviar si el cliente no consintió WhatsApp
  if (notif.clientes && notif.clientes.acepta_whatsapp === false) {
    await supabase
      .from('notificaciones')
      .update({
        estado:    'cancelada',
        error_msg: 'Cliente no autorizó recibir notificaciones por WhatsApp',
      })
      .eq('id', notificacion_id)
    return json({ error: 'Cliente no autorizó recibir WhatsApp' }, 403)
  }

  // Normalizar teléfono a formato internacional sin +
  // Ej: "+54 9 11 1234 5678" → "5491112345678"
  const telefono = notif.clientes.telefono.replace(/\D/g, '')

  try {
    const response = await fetch(whatsappApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to:                telefono,
        type:              'text',
        text:              { body: notif.mensaje },
      }),
    })

    const result = await response.json()

    if (response.ok) {
      await supabase
        .from('notificaciones')
        .update({
          estado:     'enviada',
          enviado_at: new Date().toISOString(),
          error_msg:  null,
        })
        .eq('id', notificacion_id)

      return json({ success: true, whatsapp_id: result.messages?.[0]?.id })
    } else {
      const errorMsg = result.error?.message ?? JSON.stringify(result)

      await supabase
        .from('notificaciones')
        .update({
          estado:    'fallida',
          error_msg: errorMsg,
        })
        .eq('id', notificacion_id)

      return json({ error: errorMsg }, 400)
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)

    await supabase
      .from('notificaciones')
      .update({
        estado:    'fallida',
        error_msg: errorMsg,
      })
      .eq('id', notificacion_id)

    return json({ error: errorMsg }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}
