import { NavLink, useNavigate } from 'react-router-dom'
import { Users, Car, Wrench, Bell, LogOut, UserCog, LayoutDashboard } from 'lucide-react'
import Logo from '@/components/Logo'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

const navItems = [
  { to: '/inicio',         icon: LayoutDashboard, label: 'Inicio'         },
  { to: '/clientes',       icon: Users,           label: 'Clientes'       },
  { to: '/vehiculos',      icon: Car,             label: 'Vehículos'      },
  { to: '/servicios',      icon: Wrench,          label: 'Servicios'      },
  { to: '/notificaciones', icon: Bell,            label: 'Notificaciones' },
]

const settingsItems = [
  // '/config/whatsapp' oculto: sin Embedded Signup aprobado no cumple función.
  // El archivo se mantiene para cuando Meta habilite la verificación.
  { to: '/config/usuarios', icon: UserCog,  label: 'Usuarios', soloSuperadmin: true },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const esSuperadmin = profile?.rol === 'superadmin'

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="hidden md:flex fixed top-0 left-0 h-screen w-56 bg-dark-100 border-r border-dark-400 flex-col z-20">

      {/* Logo */}
      <div className="flex justify-center py-7 border-b border-dark-400">
        <Logo />
      </div>

      {/* Navegación */}
      <nav className="flex-1 py-4 flex flex-col">
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

        {/* Sección de configuración */}
        <div className="mt-6 pt-4 border-t border-dark-400">
          <p className="px-5 mb-2 text-xs uppercase tracking-widest text-gray-300 font-semibold">
            Configuración
          </p>
          {settingsItems
            .filter(item => !item.soloSuperadmin || esSuperadmin)
            .map(({ to, icon: Icon, label }) => (
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
        </div>
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
