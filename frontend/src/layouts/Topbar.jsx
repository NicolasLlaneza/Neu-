import { useLocation } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Logo from '@/components/Logo'

const titles = {
  '/clientes':       'Clientes',
  '/vehiculos':      'Vehículos',
  '/servicios':      'Servicios',
  '/notificaciones': 'Notificaciones',
}

export default function Topbar() {
  const { pathname } = useLocation()
  const { profile } = useAuth()
  const navigate = useNavigate()

  const title = titles[pathname] ?? 'Panel'

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  return (
    <header className="fixed top-0 left-0 md:left-56 right-0 h-14 bg-dark-100 border-b border-dark-400 flex items-center justify-between px-4 md:px-6 z-10">

      {/* Mobile: logo | Desktop: título */}
      <div className="md:hidden">
        <Logo className="w-20" />
      </div>
      <h1 className="hidden md:block text-sm font-bold uppercase tracking-widest text-gray-100">
        {title}
      </h1>

      {/* Mobile: título centrado */}
      <h1 className="md:hidden absolute left-1/2 -translate-x-1/2 text-sm font-bold uppercase tracking-widest text-gray-100">
        {title}
      </h1>

      {/* Desktop: nombre | Mobile: logout */}
      <div className="flex items-center gap-3">
        <span className="hidden md:block text-xs text-gray-200">
          {profile?.nombre ?? ''}
        </span>
        <button
          onClick={handleLogout}
          className="md:hidden p-1.5 text-gray-200 hover:text-red transition-colors"
          aria-label="Cerrar sesión"
        >
          <LogOut size={18} />
        </button>
      </div>

    </header>
  )
}
