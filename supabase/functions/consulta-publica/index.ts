// ─────────────────────────────────────────────────────────────────────────────
// consulta-publica
// Wrapper de la RPC public.consulta_publica con verificación server-side
// del CAPTCHA de Cloudflare Turnstile.
//
// Body esperado: { patente: string, turnstile_token: string }
//
// Sin este wrapper, la RPC quedaba expuesta a scraping porque el CAPTCHA
// solo se validaba en el navegador (trivial de saltear con un script).
//
// Variables de entorno requeridas:
//   TURNSTILE_SECRET_KEY — Secret key de Cloudflare Turnstile
//                          (dev/test: 1x0000000000000000000000000000000AA)
// ─────────────────────────────────────────────────────────────────────────────

import { serve }        from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TURNSTILE_SECRET  = Deno.env.get('TURNSTILE_SECRET_KEY')!
const SITEVERIFY_URL    = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  const { patente, turnstile_token } = await req.json().catch(() => ({}))

  if (!patente || typeof patente !== 'string') {
    return json({ error: 'patente requerida' }, 400)
  }
  if (!turnstile_token || typeof turnstile_token !== 'string') {
    return json({ error: 'turnstile_token requerido' }, 400)
  }

  // 1. Verificar el token con Cloudflare
  const clientIp = req.headers.get('cf-connecting-ip')
                ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
                ?? undefined

  const params = new URLSearchParams({
    secret:   TURNSTILE_SECRET,
    response: turnstile_token,
  })
  if (clientIp) params.set('remoteip', clientIp)

  let verification
  try {
    const res = await fetch(SITEVERIFY_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    params.toString(),
    })
    verification = await res.json()
  } catch (err) {
    return json({ error: 'No se pudo verificar el captcha (error de red)' }, 502)
  }

  if (!verification?.success) {
    // Códigos comunes: invalid-input-response, timeout-or-duplicate, etc.
    const codes = verification?.['error-codes'] ?? ['desconocido']
    return json({
      error: 'Captcha inválido. Recargá la página e intentá de nuevo.',
      details: codes,
    }, 403)
  }

  // 2. Token válido → llamar a la RPC existente
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data, error } = await supabase.rpc('consulta_publica', { p_patente: patente })

  if (error) {
    return json({ error: 'Error al consultar la patente' }, 500)
  }

  return json(data)
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}
