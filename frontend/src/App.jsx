import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import ProtectedRoute from '@/routes/ProtectedRoute'
import AppLayout from '@/layouts/AppLayout'

import LoginPage from '@/pages/auth/LoginPage'
import ConsultaPublicaPage from '@/pages/consulta-publica/ConsultaPublicaPage'
import ClientesPage from '@/pages/clientes/ClientesPage'
import VehiculosPage from '@/pages/vehiculos/VehiculosPage'
import ServiciosPage from '@/pages/servicios/ServiciosPage'
import NotificacionesPage from '@/pages/notificaciones/NotificacionesPage'
import ConfigWhatsappPage from '@/pages/config/ConfigWhatsappPage'
import UsuariosPage from '@/pages/config/UsuariosPage'
import InicioPage from '@/pages/inicio/InicioPage'
import PrivacidadPage from '@/pages/legal/PrivacidadPage'
import TerminosPage from '@/pages/legal/TerminosPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Rutas públicas */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/consulta" element={<ConsultaPublicaPage />} />
          <Route path="/privacidad" element={<PrivacidadPage />} />
          <Route path="/terminos" element={<TerminosPage />} />

          {/* Rutas protegidas con layout */}
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
          <Route path="/config/whatsapp" element={
            <ProtectedRoute><AppLayout><ConfigWhatsappPage /></AppLayout></ProtectedRoute>
          } />
          <Route path="/config/usuarios" element={
            <ProtectedRoute><AppLayout><UsuariosPage /></AppLayout></ProtectedRoute>
          } />

          {/* Raíz → redirige al panel */}
          <Route path="/" element={<Navigate to="/inicio" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
