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

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Rutas públicas */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/consulta" element={<ConsultaPublicaPage />} />

          {/* Rutas protegidas con layout */}
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

          {/* Raíz → redirige a clientes */}
          <Route path="/" element={<Navigate to="/clientes" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
