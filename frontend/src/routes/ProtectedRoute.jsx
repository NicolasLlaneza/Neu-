import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export default function ProtectedRoute({ children }) {
  const { session, profile, loading } = useAuth()

  if (loading) return (
    <div className="min-h-screen bg-dark flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-red border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!session) return <Navigate to="/login" replace />

  // Perfil inactivo: sesión válida pero admin dado de baja
  if (profile && !profile.activo) return <Navigate to="/login" replace />

  return children
}
