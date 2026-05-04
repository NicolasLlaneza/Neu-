import { useState, useRef } from 'react'
import { Search, CheckCircle, XCircle } from 'lucide-react'
import { Turnstile } from '@marsidev/react-turnstile'
import { supabase } from '@/lib/supabase'
import Logo from '@/components/Logo'
import Button from '@/components/Button'

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY

const tipoLabels = {
  'auto-viejo': 'Automóvil',
  'auto-nuevo': 'Automóvil',
  'moto-nueva': 'Motocicleta',
}

// step: 'search' → 'confirm' → 'results'

export default function ConsultaPublicaPage() {
  const [patente, setPatente]       = useState('')
  const [step, setStep]             = useState('search')
  const [resultado, setResultado]   = useState(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)
  const [captchaToken, setCaptchaToken] = useState(null)
  const turnstileRef = useRef(null)

  async function handleBuscar(e) {
    e.preventDefault()
    if (!patente.trim()) return
    if (!captchaToken) { setError('Completá la verificación primero.'); return }

    setLoading(true)
    setError(null)

    const { data, error } = await supabase
      .rpc('consulta_publica', { p_patente: patente.trim() })

    if (error) {
      setError('Ocurrió un error al consultar. Intentá de nuevo.')
    } else if (!data) {
      setError(`No encontramos ningún vehículo con la patente ${patente}.`)
      // Resetear captcha para nueva búsqueda
      turnstileRef.current?.reset()
      setCaptchaToken(null)
    } else {
      setResultado(data)
      setStep('confirm')
    }
    setLoading(false)
  }

  function handleConfirmar() {
    setStep('results')
  }

  function handleRechazar() {
    setResultado(null)
    setStep('search')
    setPatente('')
    setCaptchaToken(null)
    turnstileRef.current?.reset()
  }

  return (
    <div className="min-h-screen bg-dark px-4 py-12">
      <div className="max-w-xl mx-auto">

        {/* Logo */}
        <div className="flex justify-center mb-10">
          <Logo />
        </div>

        {/* Título */}
        <div className="text-center mb-8">
          <h2 className="text-gray-100 text-lg font-bold uppercase tracking-widest mb-1">
            Consulta de historial
          </h2>
          <p className="text-gray-200 text-sm">
            Ingresá la patente de tu vehículo para ver sus servicios
          </p>
        </div>

        {/* ── STEP: SEARCH ── */}
        {step === 'search' && (
          <div className="space-y-4">
            <form onSubmit={handleBuscar} className="flex gap-3">
              <input
                value={patente}
                onChange={e => {
                  setPatente(e.target.value.toUpperCase().replace(/\s/g, ''))
                  setError(null)
                }}
                placeholder="Ej: AB123CD"
                maxLength={7}
                className="flex-1 bg-dark-200 border border-dark-400 text-gray-100 text-sm rounded px-4 py-2.5 outline-none focus:border-red transition-colors placeholder:text-gray-300 font-mono tracking-widest uppercase"
              />
              <Button type="submit" loading={loading} disabled={!captchaToken}>
                <Search size={15} />
                Buscar
              </Button>
            </form>

            {/* Captcha */}
            <div className="flex justify-center">
              <Turnstile
                ref={turnstileRef}
                siteKey={SITE_KEY}
                onSuccess={token => { setCaptchaToken(token); setError(null) }}
                onExpire={() => setCaptchaToken(null)}
                onError={() => { setCaptchaToken(null); setError('Error en la verificación. Recargá la página.') }}
                options={{ theme: 'dark', language: 'es' }}
              />
            </div>

            {error && (
              <p className="text-red-bright text-sm text-center">{error}</p>
            )}
          </div>
        )}

        {/* ── STEP: CONFIRM ── */}
        {step === 'confirm' && resultado && (
          <div className="bg-dark-200 border border-dark-400 rounded-lg p-6 space-y-5">
            <p className="text-gray-200 text-sm text-center">
              Encontramos el siguiente vehículo. ¿Es el tuyo?
            </p>

            <div className="bg-dark-300 rounded-lg p-4 text-center space-y-1">
              <p className="text-gray-100 text-2xl font-black font-mono tracking-widest">
                {resultado.patente}
              </p>
              <p className="text-gray-100 text-base font-semibold">
                {resultado.marca} {resultado.modelo}
                {resultado.anio && <span className="text-gray-200 font-normal"> · {resultado.anio}</span>}
              </p>
              <p className="text-gray-200 text-sm">
                {tipoLabels[resultado.tipo_patente] ?? resultado.tipo_patente}
              </p>
              {resultado.cliente_nombre && (
                <p className="text-gray-200 text-sm pt-1 border-t border-dark-400 mt-2">
                  Titular: <span className="text-gray-100 font-medium">{resultado.cliente_nombre}</span>
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant="danger"
                className="flex-1 justify-center"
                onClick={handleRechazar}
              >
                <XCircle size={15} />
                No es mi vehículo
              </Button>
              <Button
                className="flex-1 justify-center"
                onClick={handleConfirmar}
              >
                <CheckCircle size={15} />
                Sí, ver historial
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP: RESULTS ── */}
        {step === 'results' && resultado && (
          <div className="space-y-4">

            {/* Ficha */}
            <div className="bg-dark-200 border border-dark-400 rounded-lg p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-100 text-2xl font-black font-mono tracking-widest">
                    {resultado.patente}
                  </p>
                  <p className="text-gray-200 text-sm mt-1">
                    {resultado.marca} {resultado.modelo}
                    {resultado.anio && <span className="text-gray-300"> · {resultado.anio}</span>}
                  </p>
                </div>
                <span className="text-xs uppercase tracking-wider text-gray-200 bg-dark-400 px-2 py-1 rounded">
                  {tipoLabels[resultado.tipo_patente] ?? resultado.tipo_patente}
                </span>
              </div>
            </div>

            {/* Historial */}
            <div className="bg-dark-200 border border-dark-400 rounded-lg overflow-hidden">
              <div className="px-5 py-3 border-b border-dark-400">
                <h3 className="text-xs uppercase tracking-widest text-gray-200 font-semibold">
                  Historial de servicios
                </h3>
              </div>

              {resultado.servicios.length === 0 ? (
                <p className="px-5 py-6 text-gray-200 text-sm">Sin servicios registrados.</p>
              ) : (
                <div className="divide-y divide-dark-400">
                  {resultado.servicios.map((s, i) => (
                    <div key={i} className="px-5 py-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-gray-100 text-sm font-medium">{s.tipo}</span>
                        <span className="text-gray-200 text-xs">
                          {s.fecha.split('-').reverse().join('/')}
                        </span>
                      </div>
                      <div className="flex gap-4 text-xs text-gray-300">
                        <span>{s.km?.toLocaleString('es-AR')} km</span>
                        {s.producto && <span>{s.producto}</span>}
                      </div>
                      {s.observaciones && (
                        <p className="text-xs text-gray-300 mt-1">{s.observaciones}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleRechazar}
              className="text-xs text-gray-300 hover:text-gray-200 transition-colors mx-auto block"
            >
              ← Nueva consulta
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
