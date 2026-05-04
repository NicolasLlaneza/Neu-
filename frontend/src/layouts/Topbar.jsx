import { useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

const titles = {
  '/clientes':       'Clientes',
  '/vehiculos':      'Vehículos',
  '/servicios':      'Servicios',
  '/notificaciones': 'Notificaciones',
}

export default function Topbar() {
  const { pathname } = useLocation()
  const { profile } = useAuth()

  const title = titles[pathname] ?? 'Panel'

  return (
    <header className="fixed top-0 left-56 right-0 h-14 bg-dark-100 border-b border-dark-400 flex items-center justify-between px-6 z-10">
      <h1 className="text-sm font-bold uppercase tracking-widest text-gray-100">
        {title}
      </h1>
      <span className="text-xs text-gray-200">
        {profile?.nombre ?? ''}
      </span>
    </header>
  )
}
