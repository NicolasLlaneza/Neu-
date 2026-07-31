import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import ProtectedRoute from '@/routes/ProtectedRoute'
import AppLayout from '@/layouts/AppLayout'

// El login se carga siempre (es la primera pantalla del panel admin), así
// que va directo. En el host de consulta pública ni siquiera se usa.
import LoginPage from '@/pages/auth/LoginPage'

// El resto se parte en chunks: nadie necesita bajar el código de
// Servicios (que arrastra la librería de compresión de imágenes) solo
// para entrar al login. Importa sobre todo en los celulares del taller.
const RecuperarPasswordPage = lazy(() => import('@/pages/auth/RecuperarPasswordPage'))
const NuevaPasswordPage     = lazy(() => import('@/pages/auth/NuevaPasswordPage'))
const ConsultaPublicaPage   = lazy(() => import('@/pages/consulta-publica/ConsultaPublicaPage'))
const ClientesPage          = lazy(() => import('@/pages/clientes/ClientesPage'))
const VehiculosPage         = lazy(() => import('@/pages/vehiculos/VehiculosPage'))
const ServiciosPage         = lazy(() => import('@/pages/servicios/ServiciosPage'))
const NotificacionesPage    = lazy(() => import('@/pages/notificaciones/NotificacionesPage'))
// ConfigWhatsappPage se deja importable pero sin ruta activa:
// requiere Embedded Signup aprobado y hoy Meta lo bloquea.
// const ConfigWhatsappPage = lazy(() => import('@/pages/config/ConfigWhatsappPage'))
const UsuariosPage          = lazy(() => import('@/pages/config/UsuariosPage'))
const InicioPage            = lazy(() => import('@/pages/inicio/InicioPage'))
const PrivacidadPage        = lazy(() => import('@/pages/legal/PrivacidadPage'))
const TerminosPage          = lazy(() => import('@/pages/legal/TerminosPage'))

// Hosts que solo exponen la consulta pública. Cuando la app se sirve desde
// alguno de estos hostnames, el árbol de rutas admin NO SE MONTA — un cliente
// que escribe /login, /inicio o cualquier otra URL rebota a la consulta y
// nunca ve indicios de que exista un sistema interno detrás.
const HOSTS_CONSULTA_PUBLICA = ['consulta.grupocalper.com']

const esHostConsulta =
  typeof window !== 'undefined' &&
  HOSTS_CONSULTA_PUBLICA.includes(window.location.hostname)

function Cargando() {
  return (
    <div className="min-h-screen bg-dark flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-red border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

// ─── Árbol de rutas para el host de consulta pública ──────────────────
// Solo existen la consulta y las páginas legales. Todo lo demás cae en
// la consulta sin revelar la existencia del panel.
function RoutesConsulta() {
  return (
    <Routes>
      <Route path="/"            element={<ConsultaPublicaPage />} />
      <Route path="/consulta"    element={<Navigate to="/" replace />} />
      <Route path="/privacidad"  element={<PrivacidadPage />} />
      <Route path="/terminos"    element={<TerminosPage />} />
      <Route path="*"            element={<Navigate to="/" replace />} />
    </Routes>
  )
}

// ─── Árbol de rutas del panel admin ────────────────────────────────────
function RoutesAdmin() {
  return (
    <Routes>
      {/* Públicas */}
      <Route path="/login"              element={<LoginPage />} />
      <Route path="/recuperar-password" element={<RecuperarPasswordPage />} />
      <Route path="/nueva-password"     element={<NuevaPasswordPage />} />
      <Route path="/consulta"           element={<ConsultaPublicaPage />} />
      <Route path="/privacidad"         element={<PrivacidadPage />} />
      <Route path="/terminos"           element={<TerminosPage />} />

      {/* Protegidas con layout */}
      <Route path="/inicio" element={
        <ProtectedRoute><AppLayout><InicioPage /></AppLayout></ProtectedRoute>
      } />
      <Route path="/clientes" element={
        <ProtectedRoute><AppLayout><ClientesPage /></AppLayout></ProtectedRoute>
      } />
      <Route path="/vehiculos" element={
        <ProtectedRoute><AppLayout><VehiculosPage /></AppLayout></ProtectedRoute>
      } />
      <Route path="/servicios" element={
        <ProtectedRoute><AppLayout><ServiciosPage /></AppLayout></ProtectedRoute>
      } />
      <Route path="/notificaciones" element={
        <ProtectedRoute><AppLayout><NotificacionesPage /></AppLayout></ProtectedRoute>
      } />
      <Route path="/config/usuarios" element={
        <ProtectedRoute><AppLayout><UsuariosPage /></AppLayout></ProtectedRoute>
      } />

      <Route path="/" element={<Navigate to="/inicio" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<Cargando />}>
          {esHostConsulta ? <RoutesConsulta /> : <RoutesAdmin />}
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}
