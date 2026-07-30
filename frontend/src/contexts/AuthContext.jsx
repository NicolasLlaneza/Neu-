import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { invalidateAll } from '@/lib/cache'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = todavía cargando
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    // Sesión inicial (por si el usuario ya estaba logueado)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
    })

    // Escucha cambios: login, logout, token refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else setProfile(null)

      // Al cerrar sesión (o cambiar de usuario) descartamos el cache
      // en memoria para no filtrar datos entre cuentas.
      if (event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        invalidateAll()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data)
  }

  const loading = session === undefined

  return (
    <AuthContext.Provider value={{ session, profile, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
