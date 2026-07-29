// ─────────────────────────────────────────────────────────────────────────────
// CORS compartido para todas las Edge Functions
//
// Antes devolvíamos Access-Control-Allow-Origin: * , lo que permitía que
// cualquier sitio invocara nuestras funciones desde el navegador. Ahora
// respondemos solo a los orígenes conocidos.
//
// Se configura con ALLOWED_ORIGINS (separados por coma) para poder sumar
// el dominio definitivo sin redeployar las funciones.
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_ORIGINS = 'https://neumas.pages.dev,http://localhost:5173'

const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? DEFAULT_ORIGINS)
  .split(',')
  .map(o => o.trim())
  .filter(Boolean)

const BASE_HEADERS = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  // Sin Vary, un caché intermedio podría servir la respuesta de un origen a otro
  'Vary': 'Origin',
}

/**
 * Headers CORS para la request dada. Si el Origin no está en la whitelist
 * devolvemos el primero de la lista: el navegador bloquea la respuesta,
 * que es exactamente lo que queremos.
 */
export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? ''
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return { ...BASE_HEADERS, 'Access-Control-Allow-Origin': allowed }
}

/** Respuesta JSON con los headers CORS ya aplicados. */
export function jsonResponse(req: Request, data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(req) },
  })
}

/** Respuesta al preflight OPTIONS. */
export function preflight(req: Request): Response {
  return new Response('ok', { headers: corsHeaders(req) })
}
