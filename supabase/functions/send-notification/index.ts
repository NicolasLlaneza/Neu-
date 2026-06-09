// ─────────────────────────────────────────────────────────────────────────────
// send-notification
// Envía un mensaje de WhatsApp para una notificación específica.
//
// Body esperado: { notificacion_id: string }
//
// Variables de entorno requeridas:
//   WHATSAPP_PHONE_NUMBER_ID  — ID del número de teléfono en Meta
//   WHATSAPP_ACCESS_TOKEN     — Token de acceso permanente de Meta
//   INTERNAL_SECRET           — Secret compartido para llamadas internas
// ─────────────────────────────────────────────────────────────────────────────

import { serve }        from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PHONE_NUMBER_ID  = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')!
const ACCESS_TOKEN     = Deno.env.get('WHATSAPP_ACCESS_TOKEN')!
const INTERNAL_SECRET  = Deno.env.get('INTERNAL_SECRET')!
const WHATSAPP_API_URL = `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`

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

  // Buscar la notificación pendiente con datos del cliente
  const { data: notif, error: fetchError } = await supabase
    .from('notificaciones')
    .select('*, clientes(nombre, telefono)')
    .eq('id', notificacion_id)
    .eq('estado', 'pendiente')
    .single()

  if (fetchError || !notif) {
    return json({ error: 'Notificación no encontrada o ya procesada' }, 404)
  }

  // Normalizar teléfono a formato internacional sin +
  // Ej: "+54 9 11 1234 5678" → "5491112345678"
  const telefono = notif.clientes.telefono.replace(/\D/g, '')

  try {
    const response = await fetch(WHATSAPP_API_URL, {
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
