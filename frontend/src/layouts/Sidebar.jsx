import { NavLink, useNavigate } from 'react-router-dom'
import { Users, Car, Wrench, Bell, LogOut } from 'lucide-react'
import Logo from '@/components/Logo'
import { supabase } from '@/lib/supabase'

const navItems = [
  { to: '/clientes',       icon: Users,   label: 'Clientes'       },
  { to: '/vehiculos',      icon: Car,     label: 'Vehículos'      },
  { to: '/servicios',      icon: Wrench,  label: 'Servicios'      },
  { to: '/notificaciones', icon: Bell,    label: 'Notificaciones' },
]

export default function Sidebar() {
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="fixed top-0 left-0 h-screen w-56 bg-dark-100 border-r border-dark-400 flex flex-col z-20">

      {/* Logo */}
      <div className="flex justify-center py-7 border-b border-dark-400">
        <Logo />
      </div>

      {/* Navegación */}
      <nav className="flex-1 py-4">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors border-l-2 ${
                isActive
                  ? 'border-red text-gray-100 bg-dark-200'
                  : 'border-transparent text-gray-200 hover:text-gray-100 hover:bg-dark-200'
              }`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="border-t border-dark-400 p-4">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-2 py-2 text-sm text-gray-200 hover:text-red transition-colors rounded"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>

    </aside>
  )
}
